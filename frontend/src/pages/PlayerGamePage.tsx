import { useEffect, useState, useCallback } from 'react';
import { useQuestionStore } from '../stores/questionStore';
import { useResultsStore } from '../stores/resultsStore';
import { useSessionStore } from '../stores/sessionStore';
import { useGameHubConnection } from '../hooks/useGameHubConnection';
import { useGameTimer } from '../hooks/useGameTimer';
import api from '../services/api/axiosConfig';
import { getSessionState } from '../services/api/gameApi';
import { motion } from 'framer-motion';
import { playPop, playCorrect, playWrong } from '../utils/audioSystem';
import { getPlayerParticipantId } from '../utils/tokenHelper';
import { calculateCurrentScore } from '../utils/scoring';

export default function PlayerGamePage() {

  const currentQuestion = useQuestionStore((s) => s.currentQuestion);
  const timeRemaining = useQuestionStore((s) => s.timeRemaining);
  const timeLimit = useQuestionStore((s) => s.timeLimit);
  const isQuestionActive = useQuestionStore((s) => s.isQuestionActive);
  const updateTimer = useQuestionStore((s) => s.updateTimer);
  const endQuestion = useQuestionStore((s) => s.endQuestion);
  const setCurrentQuestion = useQuestionStore((s) => s.setCurrentQuestion);
  const setIsImageHidden = useQuestionStore((s) => s.setIsImageHidden);

  const questionResults = useResultsStore((s) => s.questionResults);
  const setQuestionResults = useResultsStore((s) => s.setQuestionResults);
  const needsManualReview = useResultsStore((s) => s.needsManualReview);
  const setNeedsManualReview = useResultsStore((s) => s.setNeedsManualReview);

  const session = useSessionStore((s) => s.session);

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState<any[] | null>(null);

  const sessionId = session?.id ?? new URLSearchParams(window.location.search).get('sessionId') ?? undefined;

  const handleSubmit = useCallback(async () => {
    if (!sessionId || !currentQuestion) return;
    playPop();

    try {
      const response = await api.post('/answers/submit', {
        GameSessionId: sessionId,
        QuestionId: currentQuestion.id || currentQuestion.Id,
        SelectedOptionIds: selectedOptions,
        TextAnswer: textAnswer
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('playerToken') || localStorage.getItem('playerToken')}` }
      });

      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || e.response?.data?.Message || 'Hata olustu');
    }
  }, [sessionId, currentQuestion, selectedOptions, textAnswer]);

  const handlers = {
    onQuestionStarted: (question: any, timeLimit: number) => {
      setCurrentQuestion(question, timeLimit || 30);
      setSubmitted(false);
      setSelectedOptions([]);
      setTextAnswer('');
      setAudioPlayed(false);
    },
    onTimerTick: (data: { remainingSeconds: number }) => updateTimer(data.remainingSeconds),
    onQuestionFinished: () => endQuestion(),
    onShowQuestionResults: (data: any) => setQuestionResults(data),
    onManualReviewRequired: () => setNeedsManualReview(true),
    onGameResumed: () => setNeedsManualReview(false),
    onImageHidden: () => setIsImageHidden(true),
    onGameEnded: (data: any) => {
      setQuestionResults(null);
      endQuestion();
      setCurrentQuestion(null, 0);
      setNeedsManualReview(false);
      setFinalLeaderboard(data);
    }
  };

  useGameHubConnection(sessionId || undefined, handlers);

  useEffect(() => {
    if (sessionId) {
      getSessionState(sessionId).then((state) => {
        if (state.currentQuestion) {
          setCurrentQuestion(state.currentQuestion, state.currentTimeRemaining || 30);
          updateTimer(state.currentTimeRemaining || 0);
          if (state.currentTimeRemaining === null || state.currentTimeRemaining === 0) {
            endQuestion();
          }
          setIsImageHidden(state.isImageHidden);
        }
      }).catch(console.error);
    }
  }, [sessionId, setCurrentQuestion, updateTimer, endQuestion, setIsImageHidden]);

  const timerDuration = timeLimit || 30;
  const { secondsRemaining } = useGameTimer({
    duration: timerDuration,
    serverRemaining: isQuestionActive ? timeRemaining : null,
    active: isQuestionActive
  });

  useEffect(() => {
    if (isQuestionActive) {
      updateTimer(secondsRemaining);
    }
  }, [secondsRemaining, isQuestionActive, updateTimer]);

  const handleOptionSelect = useCallback((optionId: string) => {
    playPop();
    const isMultiSelect = String(currentQuestion?.type || currentQuestion?.Type || '').toLowerCase() === 'multipleselect';
    if (isMultiSelect) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  }, [currentQuestion]);

  useEffect(() => {
    if (questionResults && !audioPlayed) {
      const isOpenEnded = String(currentQuestion?.type || currentQuestion?.Type || '').toLowerCase() === 'openended';

      let isCorrect = false;
      if (isOpenEnded) {
        const pId = getPlayerParticipantId();
        if (pId && questionResults.participantCorrectness) {
          const key = Object.keys(questionResults.participantCorrectness).find(
            (k) => k.toLowerCase() === pId.toLowerCase()
          );
          if (key) isCorrect = !!questionResults.participantCorrectness[key];
        }
      } else {
        isCorrect = questionResults.correctOptionIds?.some((id: string) => selectedOptions.includes(id));
      }

      if (isCorrect) playCorrect();
      else playWrong();
      setAudioPlayed(true);
    }
  }, [questionResults, audioPlayed, currentQuestion, selectedOptions]);

  if (finalLeaderboard) {
    const myRankEntry = finalLeaderboard.find((l) => {
      const id = getPlayerParticipantId();
      return l.ParticipantId === id || l.participantId === id;
    });

    let rank = myRankEntry?.Rank || myRankEntry?.rank || 999;
    let message = 'Quiz Bitti!';
    let color = 'text-gray-600';
    let bgColor = 'bg-white';

    if (rank === 1) {
      message = '1. Oldun! Tebrikler! 🥇';
      color = 'text-yellow-500';
      bgColor = 'bg-yellow-50 border-4 border-yellow-400';
    } else if (rank === 2) {
      message = '2. Oldun! Harika! 🥈';
      color = 'text-gray-500';
      bgColor = 'bg-gray-100 border-4 border-gray-400';
    } else if (rank === 3) {
      message = '3. Oldun! Tebrikler! 🥉';
      color = 'text-amber-600';
      bgColor = 'bg-amber-50 border-4 border-amber-500';
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`px-12 py-16 rounded-3xl shadow-2xl text-center ${bgColor} max-w-xl w-full mx-auto`}
        >
          <h2 className={`text-5xl font-black mb-8 ${color}`}>{message}</h2>
          <p className="text-2xl font-bold text-gray-700 mt-4 rounded p-4 bg-white shadow-inner">
            Puanın: {myRankEntry?.TotalScore || myRankEntry?.totalScore || 0}
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isQuestionActive && !currentQuestion) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  if (questionResults) {
    const isMultiSelect = String(currentQuestion?.type || currentQuestion?.Type || '').toLowerCase() === 'multipleselect';
    const isOpenEnded = String(currentQuestion?.type || currentQuestion?.Type || '').toLowerCase() === 'openended';

    let isCorrect = false;
    if (isOpenEnded) {
      const pId = getPlayerParticipantId();
      if (pId && questionResults.participantCorrectness) {
        const key = Object.keys(questionResults.participantCorrectness).find(
          (k) => k.toLowerCase() === pId.toLowerCase()
        );
        if (key) isCorrect = !!questionResults.participantCorrectness[key];
      }
    } else {
      isCorrect = questionResults.correctOptionIds?.some((id: string) => selectedOptions.includes(id));
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <motion.h2
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: isCorrect ? [-5, 5, 0] : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`text-4xl font-black mb-8 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}
        >
          {isCorrect ? 'Doğru!' : 'Yanlış!'}
        </motion.h2>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          {isOpenEnded ? (
            <div className="bg-white p-8 rounded-xl shadow-2xl text-center">
              <p className="text-xl font-medium text-gray-700 mb-4">Senin Cevabın:</p>
              <p className="text-2xl font-bold mb-4">{textAnswer}</p>
              <p className="text-gray-600 font-medium">{questionResults.explanation || ''}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(currentQuestion?.options || currentQuestion?.Options || []).map((option: any, optIdx: number) => {
                const optionId = option.id || option.Id;
                const optionText = option.optionText || option.OptionText;
                const isSelected = selectedOptions.includes(optionId);
                const isCorrectOption = questionResults.correctOptionIds?.includes(optionId);

                const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
                const baseBgClass = colors[optIdx % colors.length];

                let classes = `${baseBgClass} text-white p-6 rounded-xl shadow-md font-bold text-xl transition-all flex items-center justify-center border-2 border-transparent`;

                if (isCorrectOption) {
                  classes += ' opacity-100 ring-4 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)] scale-105 z-10';
                } else if (isSelected && !isCorrectOption) {
                  classes += ' opacity-50 border-4 border-red-500 ring-4 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
                } else {
                  classes += ' opacity-50 grayscale';
                }

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + optIdx * 0.1 }}
                    key={optionId}
                    className={classes}
                    style={{ minHeight: '120px' }}
                  >
                    {isMultiSelect && <span className="mr-3 text-2xl">{isSelected ? '☑' : '☐'}</span>}
                    {optionText}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-sm text-gray-400 mt-8">
          Sıradaki soru bekleniyor...
        </motion.p>
      </div>
    );
  }

  const currentPotentialScore = calculateCurrentScore(timeRemaining, timeLimit || 30);

  const isOpenEnded = String(currentQuestion?.type || currentQuestion?.Type || '').toLowerCase() === 'openended';
  const isMultiSelect = String(currentQuestion?.type || currentQuestion?.Type || '').toLowerCase() === 'multipleselect';
  const questionOptions = currentQuestion?.options || currentQuestion?.Options || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 py-3 shadow-md sticky top-0 z-50 flex items-center justify-between max-w-2xl mx-auto w-full">
        <span className="text-sm font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-200 shadow-sm flex items-center gap-1">
          <span>⚡</span>
          <span>{currentPotentialScore} Puan</span>
        </span>
        <motion.div
          animate={{ scale: [1.1, 1] }}
          transition={{ duration: 0.3 }}
          className={`text-3xl font-black ${timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}
        >
          {timeRemaining}
        </motion.div>
      </div>

      <main className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full">
        {!isQuestionActive && submitted ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-gray-800">Süre Doldu!</h2>
            <p className="text-gray-500 mt-2">Diğer oyuncular bekleniyor...</p>
          </motion.div>
        ) : submitted && needsManualReview ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-gray-800">⏳ Cevaplar değerlendiriliyor...</h2>
            <p className="text-gray-500 mt-2">Kurucu cevapları inceliyor. Lütfen bekleyin.</p>
          </motion.div>
        ) : submitted ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-gray-800">Cevap Gönderildi!</h2>
            <p className="text-gray-500 mt-2">Sürenin bitmesi bekleniyor...</p>
          </motion.div>
        ) : (
          <>
            <div className="text-center py-4">
              <p className="text-gray-500 font-medium">Lütfen ana ekrana (Host) bakınız.</p>
            </div>

            {isOpenEnded ? (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 mt-4">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Cevabınızı buraya yazın..."
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-primary-600 focus:outline-none min-h-[200px] text-lg"
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-2 text-right">{textAnswer.length}/500</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 h-64">
                {questionOptions.map((option: any, optIdx: number) => {
                  const optionId = option.id || option.Id;
                  const optionText = option.optionText || option.OptionText;
                  const isSelected = selectedOptions.includes(optionId);

                  return (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: optIdx * 0.1, type: 'spring', stiffness: 400, damping: 25 }}
                      whileTap={{ scale: 0.95 }}
                      key={optionId}
                      onClick={() => handleOptionSelect(optionId)}
                      className={`p-6 rounded-xl shadow-md font-bold text-xl transition-all flex items-center justify-center text-gray-800 border-2 ${
                        isSelected
                          ? 'bg-primary-100 border-primary-500 ring-4 ring-primary-200 scale-95'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {isMultiSelect && <span className="mr-3 text-2xl">{isSelected ? '☑' : '☐'}</span>}
                      {optionText}
                    </motion.button>
                  );
                })}
              </div>
            )}

            <div className="mt-auto pt-8 pb-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-xl shadow"
                disabled={selectedOptions.length === 0 && !textAnswer}
              >
                Cevabı Gönder
              </motion.button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}