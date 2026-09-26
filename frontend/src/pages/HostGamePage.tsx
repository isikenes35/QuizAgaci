import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../stores/gameStore';
import { getSessionById, getParticipants, hideImage } from '../services/api/gameApi';
import { getQuestions } from '../services/api/questionApi';
import { getPendingAnswers, reviewAnswer, resumeFromReview } from '../services/api/answerApi';
import type { PendingAnswer } from '../types/answer.types';
import { gameHubService } from '../services/signalr/gameHubService';
import api from '../services/api/axiosConfig';

export default function HostGamePage() {
  const { id } = useParams<{ id: string }>();
  const { session, setSession, participants, setParticipants, addParticipant, currentQuestion, isQuestionActive, leaderboard, setLeaderboard, setNeedsManualReview, timeRemaining, timeLimit, updateTimer, endQuestion, setCurrentQuestion, isImageHidden } = useGameStore();

  const [viewState, setViewState] = useState<'lobby' | 'question' | 'leaderboard' | 'review'>('lobby');
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;

    getSessionById(id).then(s => {
       setSession(s);
       // Fetch questions to know the total count for the "Finish Test" button
       if (s.quizId) {
          getQuestions(s.quizId).then(questions => {
             setTotalQuestions(questions.length);
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
      gameHubService.onQuestionFinished(() => {
        endQuestion();
        
        // If it's the last question, don't automatically jump to leaderboard.
        // Wait for manual click to "Finish Test".
        
        // removed storeIndex
        
        // We'll rely on the manual button if it's the last question.
        setTimeout(async () => {
           if (!useGameStore.getState().needsManualReview && id) {
              setViewState('question'); // Keep in question view
           }
        }, 100);
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

  const handleReview = async (answerId: string, isCorrect: boolean) => {
    if (!currentQuestion) return;
    try {
      const score = isCorrect ? (currentQuestion.maxScore || 1000) : 0;
      await reviewAnswer(answerId, { isCorrect, scoreAwarded: score });
      setPendingAnswers(prev => prev.filter(a => a.answerId !== answerId));
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
          setViewState('leaderboard');
        } catch (e) {
          console.error(e);
        }
      }, 500);
    } catch (e) {
      console.error(e);
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
      setViewState('leaderboard');
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

  
  if (!session) return <div className="p-8">Loading host lobby...</div>;

  const joinUrl = `${window.location.origin}/`;

  if (viewState === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-8">
        <h2 className="text-3xl font-bold text-center mb-4">Manual Review</h2>
        <p className="text-center text-gray-500 mb-8">Review the submitted answers before showing the leaderboard.</p>
        
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {pendingAnswers.map((ans, index) => (
            <div key={ans.answerId} className="bg-white p-6 rounded-xl shadow border border-gray-200 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">Player {index + 1}</p>
                <p className="text-xl font-medium">{ans.textAnswer}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleReview(ans.answerId, false)} className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded-lg transition-colors">
                  Reject
                </button>
                <button onClick={() => handleReview(ans.answerId, true)} className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-bold rounded-lg transition-colors">
                  Approve
                </button>
              </div>
            </div>
          ))}

          {pendingAnswers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl font-bold text-gray-800 mb-4">All answers reviewed!</p>
              <button onClick={handleFinishReview} className="px-6 py-3 bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600 transition-colors">
                Continue Game
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewState === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-8">
        <h2 className="text-4xl font-black text-center mb-8 text-gray-800">Leaderboard</h2>
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-gray-100">
          {leaderboard.map((entry, index) => {
            const isTop3 = index < 3;
            let rankColor = 'text-gray-500';
            let bgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            let scale = 'scale-100';

            if (index === 0) { rankColor = 'text-yellow-500'; bgColor = 'bg-yellow-50 border-l-4 border-yellow-500'; scale = 'scale-105 shadow-md z-10 relative'; }
            else if (index === 1) { rankColor = 'text-gray-400'; bgColor = 'bg-gray-100 border-l-4 border-gray-400'; scale = 'scale-102 shadow-sm z-10 relative'; }
            else if (index === 2) { rankColor = 'text-amber-600'; bgColor = 'bg-amber-50 border-l-4 border-amber-600'; scale = 'scale-102 shadow-sm z-10 relative'; }

            return (
              <div key={entry.ParticipantId || entry.participantId} className={`flex items-center justify-between px-8 py-5 transition-transform ${bgColor} ${scale}`}>
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
              </div>
            );
          })}
          {leaderboard.length === 0 && <div className="p-12 text-center text-gray-400 font-medium text-lg">No participants yet</div>}
        </div>
        <div className="flex justify-center mt-12 py-8">
          {currentQuestionIndex + 1 < totalQuestions ? (
            <button onClick={handleStartNextQuestion} className="px-8 py-4 bg-primary-500 text-white rounded-xl font-black text-2xl shadow-lg hover:bg-primary-600 hover:shadow-xl transition-all transform hover:-translate-y-1">
              Next Question
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-8 py-4 shadow flex justify-between items-center">
        <h1 className="text-2xl font-bold">{session.gameCode}</h1>
        <div className="flex gap-4">
          
          {viewState === 'question' && isQuestionActive && (
            <>
              <button onClick={handlePause} className="bg-yellow-500 text-white px-4 py-2 rounded font-bold hover:bg-yellow-600">
                Pause
              </button>
              <button onClick={handleResume} className="bg-green-500 text-white px-4 py-2 rounded font-bold hover:bg-green-600">
                Resume
              </button>
              <button onClick={handleExtend} className="bg-purple-500 text-white px-4 py-2 rounded font-bold hover:bg-purple-600">
                +10s
              </button>
            </>
          )}

          {viewState === 'question' && isQuestionActive && (
            <button onClick={handleHideImage} className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-gray-900">
              Hide Image
            </button>
          )}
          {viewState === 'question' && !isQuestionActive && (
            <button onClick={handleShowResults} className="bg-blue-500 text-white px-6 py-2 rounded font-bold hover:bg-blue-600">
              {currentQuestionIndex + 1 >= totalQuestions ? 'Finish Test' : 'Show Results'}
            </button>
          )}
          {viewState === 'lobby' && (
            <button onClick={handleStartNextQuestion} className="bg-primary-500 text-white px-6 py-2 rounded font-bold hover:bg-primary-600">
              Start Game
            </button>
          )}
        </div>
      </header>
      
      <main className="flex-1 p-8">
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
                <h3 className="text-2xl font-bold text-gray-800">Players</h3>
                <div className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-700 text-xl">
                  {participants.length}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {participants.map(p => (
                    <div key={p.id} className="bg-gray-50 px-4 py-3 rounded-lg text-center border border-gray-200 font-semibold text-gray-700 shadow-sm animate-fade-in">
                      {p.nickname}
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 mt-12 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                      Waiting for players to join...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewState === 'question' && currentQuestion && (
          <div className="flex flex-col items-center h-full max-w-5xl mx-auto w-full">
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden shadow-inner">
              <div 
                className="bg-primary-500 h-4 rounded-full transition-all duration-1000 ease-linear" 
                style={{ width: `${(timeRemaining / timeLimit) * 100}%` }}
              ></div>
            </div>

            <div className="flex justify-between w-full mb-8 items-center px-4">
               <span className="text-gray-500 font-bold text-xl uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {totalQuestions || '?'}
               </span>
               <div className="bg-white px-6 py-2 rounded-full shadow border-2 border-gray-100">
                  <span className={`text-4xl font-black ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                    {timeRemaining}
                  </span>
               </div>
            </div>

            <h2 className="text-5xl font-black text-center text-gray-900 mb-12 leading-tight">
              {currentQuestion.questionText || currentQuestion.QuestionText}
            </h2>

            {currentQuestion.imagePath && !isImageHidden && (
              <div className="w-full max-w-2xl bg-white p-4 rounded-2xl shadow-lg border border-gray-100 mb-8">
                <img 
                  src={currentQuestion.imagePath} 
                  alt="Question" 
                  className="w-full h-auto max-h-[400px] object-contain rounded-xl" 
                />
              </div>
            )}

            {currentQuestion.imagePath && isImageHidden && (
              <div className="w-full max-w-2xl bg-gray-100 p-4 rounded-2xl shadow-inner border border-gray-200 mb-8 h-64 flex items-center justify-center">
                 <span className="text-2xl font-bold text-gray-400">Image is currently hidden</span>
              </div>
            )}

            {/* If it's a multiple choice/select question, show options on host screen for audience */}
            {currentQuestion.options && currentQuestion.type !== 'OpenEnded' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-auto">
                {currentQuestion.options.map((option: any, optIdx: number) => {
                   const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
                   const bgColor = colors[optIdx % colors.length];
                   return (
                     <div key={option.id || option.Id} className={`${bgColor} text-white p-8 rounded-2xl shadow-md min-h-[120px] flex justify-center items-center`}>
                        <span className="text-3xl font-bold text-center drop-shadow-md">
                          {option.optionText || option.OptionText}
                        </span>
                     </div>
                   )
                })}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
