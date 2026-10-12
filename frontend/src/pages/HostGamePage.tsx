import { getImageUrl } from '../utils/imageHelper';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../stores/gameStore';
import { getSessionById, getParticipants, hideImage, getSessionState } from '../services/api/gameApi';
import { getQuestions } from '../services/api/questionApi';
import { getPendingAnswers, reviewAnswer, resumeFromReview } from '../services/api/answerApi';
import type { PendingAnswer } from '../types/answer.types';
import { gameHubService } from '../services/signalr/gameHubService';
import api from '../services/api/axiosConfig';
import { motion } from 'framer-motion';
import { playStart, playTick, playCelebration } from '../utils/audioSystem';
import confetti from 'canvas-confetti';

export default function HostGamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, setSession, participants, setParticipants, addParticipant, currentQuestion, isQuestionActive, leaderboard, setLeaderboard, setNeedsManualReview, timeRemaining, timeLimit, updateTimer, endQuestion, setCurrentQuestion, isImageHidden } = useGameStore();

  const [viewState, setViewState] = useState<'lobby' | 'question' | 'leaderboard' | 'review' | 'finalScreen'>('lobby');
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selectedCorrectAnswers, setSelectedCorrectAnswers] = useState<string[]>([]);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const lastTimeRef = useRef(timeRemaining);

  useEffect(() => {
    if (viewState === 'question' && timeRemaining <= 5 && timeRemaining > 0 && timeRemaining !== lastTimeRef.current) {
        lastTimeRef.current = timeRemaining;
        playTick();
    }
  }, [timeRemaining, viewState]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;

    getSessionById(id).then(s => {
       setSession(s);
       if (s.quizId) {
          getQuestions(s.quizId).then(questions => {
             setTotalQuestions(questions.length);
             getSessionState(id).then(state => {
                if (state.currentQuestion) {
                   const q = state.currentQuestion;
                   const idx = questions.findIndex((x: any) => x.id === q.id || x.Id === q.Id || x.Id === q.id);
                   if (idx !== -1) setCurrentQuestionIndex(idx);
                   setCurrentQuestion(q, state.currentTimeRemaining || 30);
                   useGameStore.getState().setAnswersCount(state.currentAnswersCount || 0);
                   if (state.currentTimeRemaining === null || state.currentTimeRemaining === 0) {
                      endQuestion();
                   }
                   setViewState('question');
                }
             }).catch(console.error);
          }).catch(console.error);
       }
    }).catch(console.error);
    getParticipants(id).then(setParticipants).catch(console.error);

    gameHubService.connect(token, id).then(() => {
      gameHubService.onPlayerJoined((p) => {
        addParticipant(p);
      });
      gameHubService.onQuestionStarted((question, timeLimit) => {
        setCurrentQuestion(question, timeLimit || 30);
        setCurrentQuestionIndex(prev => prev + 1);
        setViewState('question');
        playStart();
      });
      gameHubService.onLeaderboardUpdated((data) => {
        setLeaderboard(data);
        setViewState('leaderboard');
      });
      gameHubService.onManualReviewRequired(() => {
        setNeedsManualReview(true);
        setViewState('review');
        loadPendingAnswers();
      });
      gameHubService.onTimerTick((data) => {
        updateTimer(data.remainingSeconds);
      });
      gameHubService.onAnswerSubmitted(() => {
        useGameStore.getState().incrementAnswerCount();
      });
      gameHubService.onImageHidden(() => {
        useGameStore.getState().setIsImageHidden(true);
      });
      gameHubService.onQuestionFinished(() => {
        endQuestion();
        
        // If it's the last question, don't automatically jump to leaderboard.
        // Wait for manual click to "Finish Test".
        
        // removed storeIndex
        
        // We'll rely on the manual button if it's the last question.
        setTimeout(async () => {
           if (!useGameStore.getState().needsManualReview && id) {
              try {
                await api.post(`/gamesessions/${id}/show-results`);
              } catch (e) {
                console.error(e);
              }
           }
        }, 1000);
      });
    });

    return () => {
      gameHubService.disconnect();
    };
  }, [id, setSession, setParticipants, addParticipant, setLeaderboard, setCurrentQuestion, updateTimer, endQuestion]);

  const loadPendingAnswers = async () => {
    if (!id) return;
    try {
      const answers = await getPendingAnswers(id);
      setPendingAnswers(answers);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishReview = async () => {
    if (!id) return;
    try {
      await resumeFromReview(id);
      setNeedsManualReview(false);
      // Wait a bit, then show results/leaderboard automatically
      setTimeout(async () => {
        try {
          await api.post(`/gamesessions/${id}/show-results`);
        } catch (e) {
          console.error(e);
        }
      }, 500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishQuiz = async () => {
    if (!id) return;
    try {
      await api.post(`/gamesessions/${id}/finish`);
      setViewState('finalScreen');
      playCelebration();
      
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF4500']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF4500']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();
    } catch (e: any) {
      console.error(e);
      alert("Error finishing quiz: " + (e.response?.data?.message || e.message));
    }
  };

  const handleStartNextQuestion = async () => {
    try {
      console.log("Requesting Next Question for session: ", id);
      await api.post(`/gamesessions/${id}/next-question`);
      setViewState('question');
    } catch (e: any) {
      console.error("Start Game Error:", e.response?.data || e.message);
      alert('Failed to start next question: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleShowResults = async () => {
    try {
      await api.post(`/gamesessions/${id}/show-results`);
    } catch (e) {
      console.error(e);
    }
  };

  
  const handlePause = async () => {
    if (!id) return;
    try { await api.post(`/gamesessions/${id}/pause`); } catch (e) { console.error(e); }
  };
  const handleResume = async () => {
    if (!id) return;
    try { await api.post(`/gamesessions/${id}/resume`); } catch (e) { console.error(e); }
  };
  const handleExtend = async () => {
    if (!id) return;
    try { await api.post(`/gamesessions/${id}/extend`, 10, { headers: { 'Content-Type': 'application/json' } }); } catch (e) { console.error(e); }
  };

  const handleHideImage = async () => {
    if (!id) return;
    try {
      await hideImage(id);
    } catch (e) {
      console.error(e);
    }
  };

  
  if (!session) return <div className="p-8">Oyun yükleniyor...</div>;

  const joinUrl = `${window.location.origin}/`;

  if (viewState === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-8">
        <h2 className="text-3xl font-bold text-center mb-4">Manuel Değerlendirme</h2>
        <p className="text-center text-gray-500 mb-8">Gönderilen cevapları inceleyin. Doğru olanları seçin.</p>
        
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {pendingAnswers.map((ans, index) => {
            const isSelected = selectedCorrectAnswers.includes(ans.answerId);
            return (
              <div 
                key={ans.answerId} 
                onClick={() => {
                  if (isSelected) {
                    setSelectedCorrectAnswers(prev => prev.filter(id => id !== ans.answerId));
                  } else {
                    setSelectedCorrectAnswers(prev => [...prev, ans.answerId]);
                  }
                }}
                className="p-6 rounded-xl shadow border flex justify-between items-center cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-gray-400 mb-1">Oyuncu {index + 1}</p>
                  <p className="text-xl font-medium">{ans.textAnswer}</p>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    readOnly
                    className="w-6 h-6 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                </div>
              </div>
            );
          })}

          {pendingAnswers.length > 0 && (
            <div className="text-center mt-8 pt-4">
              <button 
                onClick={async () => {
                  try {
                    await Promise.all(pendingAnswers.map(ans => {
                      const isCorrect = selectedCorrectAnswers.includes(ans.answerId);
                      const score = isCorrect ? (currentQuestion?.maxScore || 2000) : 0;
                      return reviewAnswer(ans.answerId, { isCorrect, scoreAwarded: score });
                    }));
                    setPendingAnswers([]);
                    setSelectedCorrectAnswers([]);
                    await handleFinishReview();
                  } catch (e) {
                     console.error(e);
                  }
                }}
                className="w-full px-8 py-4 bg-primary-500 text-white rounded-xl font-black text-2xl shadow-lg hover:bg-primary-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                Seçilenleri Doğru İşaretle ve Devam Et
              </button>
            </div>
          )}

          {pendingAnswers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl font-bold text-gray-800 mb-4">Tüm cevaplar incelendi!</p>
              <button onClick={handleFinishReview} className="px-6 py-3 bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600 transition-colors">
                Oyuna Devam Et
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewState === 'finalScreen') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
        <motion.h2 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-600 mb-12 drop-shadow-2xl"
        >
          Quiz Tamamlandı!
        </motion.h2>
        
        <div className="flex justify-center items-end gap-6 h-64 mt-12 w-full max-w-4xl mx-auto px-4 z-10">
          {(() => {
            const top3 = [...leaderboard].slice(0, 3);
            
            // Gold, Silver, Bronze order: 2nd (left), 1st (center), 3rd (right)
            // Or just map them exactly by rank. Let's do a simple 1st, 2nd, 3rd layout.
            const p1 = top3[0];
            const p2 = top3[1];
            const p3 = top3[2];
            
            return (
              <>
                {p2 && (
                  <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center flex-1">
                    <span className="text-xl font-bold text-gray-200 truncate w-full text-center">{p2.Nickname || p2.nickname}</span>
                    <div className="w-full bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-xl mt-2 h-32 shadow-[0_0_20px_rgba(209,213,219,0.3)] border-t border-gray-400">
                      <div className="text-4xl text-center mt-4">🥈</div>
                    </div>
                  </motion.div>
                )}
                
                {p1 && (
                  <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="flex flex-col items-center flex-1">
                    <span className="text-2xl font-bold text-yellow-300 truncate w-full text-center drop-shadow-md">{p1.Nickname || p1.nickname}</span>
                    <div className="w-full bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-xl mt-2 h-48 shadow-[0_0_30px_rgba(250,204,21,0.5)] border-t border-yellow-200">
                      <div className="text-5xl text-center mt-4">🥇</div>
                    </div>
                  </motion.div>
                )}
                
                {p3 && (
                  <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0 }} className="flex flex-col items-center flex-1">
                    <span className="text-xl font-bold text-amber-600 truncate w-full text-center">{p3.Nickname || p3.nickname}</span>
                    <div className="w-full bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-xl mt-2 h-24 shadow-[0_0_15px_rgba(217,119,6,0.3)] border-t border-amber-500">
                      <div className="text-4xl text-center mt-4">🥉</div>
                    </div>
                  </motion.div>
                )}
              </>
            );
          })()}
        </div>
        
        <motion.button 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          onClick={() => navigate('/dashboard')} 
          className="mt-16 px-8 py-3 bg-white text-gray-900 rounded-full font-bold shadow-xl hover:bg-gray-100 z-10"
        >
          Panoya Dön
        </motion.button>
      </div>
    );
  }

  if (viewState === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-8">
        <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black text-center mb-8 text-gray-800">Liderlik Tablosu</motion.h2>
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {leaderboard.map((entry, index) => {
            const isTop3 = index < 3;
            let rankColor = 'text-gray-500';
            let bgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            let scaleClass = 'scale-100';

            if (index === 0) { rankColor = 'text-yellow-500'; bgColor = 'bg-yellow-50 border-l-4 border-yellow-500'; scaleClass = 'shadow-md z-10 relative'; }
            else if (index === 1) { rankColor = 'text-gray-400'; bgColor = 'bg-gray-100 border-l-4 border-gray-400'; scaleClass = 'shadow-sm z-10 relative'; }
            else if (index === 2) { rankColor = 'text-amber-600'; bgColor = 'bg-amber-50 border-l-4 border-amber-600'; scaleClass = 'shadow-sm z-10 relative'; }

            return (
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                whileHover={{ scale: 1.02 }}
                key={entry.ParticipantId || entry.participantId} 
                className={`flex items-center justify-between px-8 py-5 transition-transform ${bgColor} ${scaleClass}`}
              >
                <div className="flex items-center gap-6">
                  <span className={`text-4xl font-black ${rankColor} w-8 text-center`}>{index + 1}</span>
                  <span className={`text-2xl font-bold ${isTop3 ? 'text-gray-900' : 'text-gray-700'}`}>{entry.Nickname || entry.nickname}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black text-primary-600">{entry.TotalScore || entry.totalScore}</span>
                  {(entry.ScoreDelta > 0 || entry.scoreDelta > 0) && (
                     <span className="text-sm font-bold text-green-500">+{entry.ScoreDelta || entry.scoreDelta}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
          {leaderboard.length === 0 && <div className="p-12 text-center text-gray-400 font-medium text-lg">Henüz katılımcı yok</div>}
        </div>
        <div className="flex justify-center mt-12 py-8">
          {currentQuestionIndex + 1 < totalQuestions ? (
            <button onClick={handleStartNextQuestion} className="px-8 py-4 bg-primary-500 text-white rounded-xl font-black text-2xl shadow-lg hover:bg-primary-600 hover:shadow-xl transition-all transform hover:-translate-y-1">
              Sıradaki Soru
            </button>
          ) : (
              <button onClick={handleFinishQuiz} className="px-8 py-4 bg-red-500 text-white rounded-xl font-black text-2xl shadow-lg hover:bg-red-600 hover:shadow-xl transition-all transform hover:-translate-y-1">
                Yarışmayı Bitir
              </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 flex flex-col ${viewState === 'question' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'}`}>
      <header className="bg-white px-4 md:px-6 py-2 md:py-2.5 shadow flex justify-between items-center flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-wider">{session.gameCode}</h1>
          <button 
            type="button"
            onClick={toggleFullscreen}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Tam Ekran Aç/Kapat (Projeksiyon Modu)"
          >
            <span>⛶</span>
            <span className="hidden sm:inline">Tam Ekran</span>
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          
          {viewState === 'question' && isQuestionActive && (
            <>
              <button onClick={handlePause} className="bg-yellow-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-yellow-600">
                Pause
              </button>
              <button onClick={handleResume} className="bg-green-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-green-600">
                Resume
              </button>
              <button onClick={handleExtend} className="bg-purple-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-purple-600">
                +10s
              </button>
              <button onClick={handleShowResults} className="bg-red-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-red-600">{currentQuestionIndex + 1 >= totalQuestions ? 'Testi Bitir' : 'Soruyu Bitir'}</button>
            </>
          )}

          {viewState === 'question' && isQuestionActive && (
            <button onClick={handleHideImage} className="bg-gray-800 text-white px-4 md:px-6 py-1.5 rounded font-bold text-sm md:text-base hover:bg-gray-900">
              Görseli Gizle
            </button>
          )}
          {viewState === 'question' && !isQuestionActive && (
            <button onClick={handleShowResults} className="bg-blue-500 text-white px-4 md:px-6 py-1.5 rounded font-bold text-sm md:text-base hover:bg-blue-600">
              {currentQuestionIndex + 1 >= totalQuestions ? 'Sonuçları Gör' : 'Sonuçları Göster'}
            </button>
          )}
          {viewState === 'lobby' && (
            <button onClick={handleStartNextQuestion} className="bg-primary-500 text-white px-6 py-2 rounded font-bold hover:bg-primary-600">
              Oyunu Başlat
            </button>
          )}
        </div>
      </header>
      
      <main className={`flex-1 ${viewState === 'question' ? 'p-2 md:p-3 flex flex-col min-h-0 overflow-hidden' : 'p-8'}`}>
        {viewState === 'lobby' && (
          <div className="flex gap-8 h-full">
            {/* Left Side - Access Info */}
            <div className="w-1/3 flex flex-col items-center justify-center bg-white rounded-xl shadow p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Join at {joinUrl}</h2>
              <div className="bg-primary-50 p-4 border border-primary-100 rounded-lg mb-8">
                <p className="text-sm text-primary-600 font-semibold mb-1">Game Code</p>
                <p className="text-5xl font-black text-primary-600 tracking-widest uppercase">
                  {session.gameCode}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <QRCodeSVG value={`${joinUrl}?code=${session.gameCode}`} size={200} />
              </div>
            </div>

              {/* Right Side - Participants */}
              <div className="flex-1 bg-white rounded-xl shadow p-8 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Oyuncular</h3>
                  <div className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-700 text-xl">
                    {participants.length}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {participants.map(p => (
                      <motion.div 
                        key={p.id} 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="bg-gray-50 px-4 py-3 rounded-lg text-center border border-gray-200 font-semibold text-gray-700 shadow-sm"
                      >
                        {p.nickname}
                      </motion.div>
                    ))}
                    {participants.length === 0 && (
                      <div className="col-span-full text-center text-gray-400 mt-12 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                        Oyuncuların katılması bekleniyor...
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewState === 'question' && currentQuestion && (() => {
          const hasImage = Boolean((currentQuestion.imagePath || currentQuestion.ImagePath) && !isImageHidden);
          const totalLimit = timeLimit || 30;
          const elapsedSeconds = Math.max(0, totalLimit - timeRemaining);
          const graceSeconds = Math.min(10, Math.max(0, totalLimit - 5));
          const decayWindow = Math.max(totalLimit - graceSeconds, 1);

          let currentPotentialScore = 2000;
          if (elapsedSeconds > graceSeconds) {
            const elapsedDecay = elapsedSeconds - graceSeconds;
            const multiplier = Math.max(0, (decayWindow - elapsedDecay) / decayWindow);
            currentPotentialScore = Math.round(1000 + (1000 * multiplier));
          }

          return (
            <div className="flex flex-col items-center flex-1 min-h-0 w-full max-w-[96vw] 2xl:max-w-[92vw] mx-auto justify-between">
              
              <div className="w-full flex-shrink-0">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-1000 ease-linear" 
                    style={{ width: `${(timeRemaining / Math.max(timeLimit || 30, 1)) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between w-full mb-1 items-center px-1">
                   <div className="flex items-center gap-2.5">
                     <span className="text-gray-500 font-extrabold text-sm md:text-base uppercase tracking-wider">
                        Soru {currentQuestionIndex + 1} / {totalQuestions || '?'}
                     </span>
                     <span className="text-primary-600 font-bold text-xs md:text-sm bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
                        Cevaplar: {useGameStore.getState().answersCount} / {participants.length}
                        {useGameStore.getState().answersCount === participants.length && participants.length > 0 && " (Tamamlandı)"}
                     </span>
                   </div>
                   <div className="flex items-center gap-2 md:gap-3">
                      <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full border border-primary-200 font-bold text-sm md:text-base flex items-center gap-1.5 shadow-sm">
                        <span>⚡</span>
                        <span>{currentPotentialScore} Puan</span>
                      </div>
                      <div className="bg-white px-4 py-0.5 rounded-full shadow border-2 border-gray-100 min-w-[60px] text-center">
                        <span className={`text-2xl md:text-3xl font-black ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                          {timeRemaining}
                        </span>
                      </div>
                   </div>
                </div>
              </div>

              <h2 className={`${hasImage ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl my-1' : 'text-3xl md:text-5xl lg:text-6xl my-auto'} font-black text-center text-gray-900 leading-snug px-4 max-w-6xl flex-shrink-0 line-clamp-2`}>
                {currentQuestion.questionText || currentQuestion.QuestionText}
              </h2>

              {hasImage && (
                <div className="w-full flex-1 min-h-0 bg-white p-2 md:p-3 rounded-2xl shadow-md border border-gray-100 my-1 md:my-1.5 flex items-center justify-center overflow-hidden">
                  <img 
                    src={getImageUrl(currentQuestion.imagePath || currentQuestion?.ImagePath)} 
                    alt="Soru görseli" 
                    className="w-full h-full max-h-full max-w-full object-contain rounded-xl" 
                  />
                </div>
              )}

              {(currentQuestion.imagePath || currentQuestion.ImagePath) && isImageHidden && (
                <div className="w-full flex-1 min-h-0 bg-gray-100 p-4 rounded-2xl shadow-inner border border-gray-200 my-2 flex items-center justify-center">
                   <span className="text-xl md:text-2xl font-bold text-gray-400">Görsel şu an gizli</span>
                </div>
              )}

              {((currentQuestion.options || currentQuestion.Options) || []).length > 0 && String(currentQuestion.type || currentQuestion.Type || '').toLowerCase() !== 'openended' && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 w-full flex-shrink-0 ${hasImage ? 'mt-1' : 'my-auto max-w-5xl'}`}>
                  {(currentQuestion.options || currentQuestion.Options).map((option: any, optIdx: number) => {
                     const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
                     const bgColor = colors[optIdx % colors.length];
                     return (
                       <div key={option.id || option.Id} className={`${bgColor} text-white px-4 py-2 md:py-3 rounded-xl shadow min-h-[46px] md:min-h-[52px] max-h-[64px] flex items-center justify-center text-center`}>
                          <span className="text-base md:text-lg lg:text-xl font-bold drop-shadow-sm line-clamp-2">
                            {option.optionText || option.OptionText}
                          </span>
                       </div>
                     )
                  })}
                </div>
              )}

            </div>
          );
        })()}
      </main>
    </div>
  );
}










