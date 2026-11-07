import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { useQuestionStore } from '../stores/questionStore';
import { useResultsStore } from '../stores/resultsStore';
import { useGameHubConnection } from '../hooks/useGameHubConnection';
import { getSessionById, getParticipants, hideImage, getSessionState } from '../services/api/gameApi';
import { getQuestions } from '../services/api/questionApi';
import { getPendingAnswers, resumeFromReview, reviewAnswer } from '../services/api/answerApi';
import api from '../services/api/axiosConfig';
import { getImageUrl } from '../utils/imageHelper';
import type { HostViewState } from '../components/host/HostHeader';
import { HostHeader } from '../components/host/HostHeader';
import { LobbyView } from '../components/host/LobbyView';
import { QuestionDisplay } from '../components/host/QuestionDisplay';
import { LeaderboardView } from '../components/host/LeaderboardView';
import { ManualReviewView } from '../components/host/ManualReviewView';
import { FinalScreenView } from '../components/host/FinalScreenView';
import type { PendingAnswer } from '../types/answer.types';

export default function HostGamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const setSession = useSessionStore((s) => s.setSession);
  const setParticipants = useSessionStore((s) => s.setParticipants);
  const addParticipant = useSessionStore((s) => s.addParticipant);

  const currentQuestion = useQuestionStore((s) => s.currentQuestion);
  const updateTimer = useQuestionStore((s) => s.updateTimer);
  const endQuestion = useQuestionStore((s) => s.endQuestion);
  const setCurrentQuestion = useQuestionStore((s) => s.setCurrentQuestion);
  const setIsImageHidden = useQuestionStore((s) => s.setIsImageHidden);
  const incrementAnswerCount = useQuestionStore((s) => s.incrementAnswerCount);
  const setAnswersCount = useQuestionStore((s) => s.setAnswersCount);
  const setTimerPaused = useQuestionStore((s) => s.setTimerPaused);

  const leaderboard = useResultsStore((s) => s.leaderboard);
  const setLeaderboard = useResultsStore((s) => s.setLeaderboard);
  const setNeedsManualReview = useResultsStore((s) => s.setNeedsManualReview);

  const [viewState, setViewState] = useState<HostViewState>('lobby');
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const showResultsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

  const clearShowResultsTimeout = useCallback(() => {
    if (showResultsTimeoutRef.current) {
      clearTimeout(showResultsTimeoutRef.current);
      showResultsTimeoutRef.current = null;
    }
  }, []);

  const handleStart = useCallback(async () => {
    if (!id) return;
    try {
      clearShowResultsTimeout();
      setNeedsManualReview(false);
      await api.post(`/gamesessions/${id}/next-question`);
      setViewState('question');
    } catch (e: any) {
      console.error('Start Game Error:', e.response?.data || e.message);
      alert('Failed to start next question: ' + (e.response?.data?.message || e.message));
    }
  }, [id, clearShowResultsTimeout, setNeedsManualReview]);

  const handlePause = useCallback(async () => {
    if (!id) return;
    try { await api.post(`/gamesessions/${id}/pause`); } catch (e) { console.error(e); }
  }, [id]);

  const handleResume = useCallback(async () => {
    if (!id) return;
    try { await api.post(`/gamesessions/${id}/resume`); } catch (e) { console.error(e); }
  }, [id]);

  const handleExtend = useCallback(async () => {
    if (!id) return;
    try {
      await api.post(`/gamesessions/${id}/extend`, 10, { headers: { 'Content-Type': 'application/json' } });
    } catch (e) { console.error(e); }
  }, [id]);

  const handleShowResults = useCallback(async () => {
    if (!id) return;
    clearShowResultsTimeout();
    try { await api.post(`/gamesessions/${id}/show-results`); } catch (e) { console.error(e); }
  }, [id, clearShowResultsTimeout]);

  const handleHideImage = useCallback(async () => {
    if (!id) return;
    try { await hideImage(id); } catch (e) { console.error(e); }
  }, [id]);

  const handleFinishQuiz = useCallback(async () => {
    if (!id) return;
    try {
      await api.post(`/gamesessions/${id}/finish`);
      setViewState('finalScreen');
    } catch (e: any) {
      console.error(e);
      alert('Error finishing quiz: ' + (e.response?.data?.message || e.message));
    }
  }, [id]);

  const handleNextQuestion = useCallback(async () => {
    if (!id) return;
    try {
      clearShowResultsTimeout();
      setNeedsManualReview(false);
      await api.post(`/gamesessions/${id}/next-question`);
      setViewState('question');
    } catch (e: any) {
      console.error(e);
    }
  }, [id, clearShowResultsTimeout, setNeedsManualReview]);

  const loadPendingAnswers = useCallback(async () => {
    if (!id) return;
    try {
      const answers = await getPendingAnswers(id);
      setPendingAnswers(Array.isArray(answers) ? answers : []);
    } catch (e) { console.error(e); }
  }, [id]);

  const handleFinishReview = useCallback(async () => {
    if (!id) return;
    try {
      clearShowResultsTimeout();
      await resumeFromReview(id);
      setNeedsManualReview(false);
      setPendingAnswers([]);
      await api.post(`/gamesessions/${id}/show-results`);
    } catch (e) { console.error(e); }
  }, [id, setNeedsManualReview, clearShowResultsTimeout]);

  const handleReview = useCallback(async (selectedCorrectIds: string[]) => {
    if (!id || !currentQuestion) return;
    try {
      const maxScore = currentQuestion.maxScore ?? currentQuestion.MaxScore ?? 2000;
      await Promise.all(
        pendingAnswers.map((ans) => {
          const isCorrect = selectedCorrectIds.includes(ans.answerId);
          const score = isCorrect ? maxScore : 0;
          return reviewAnswer(ans.answerId, { isCorrect, scoreAwarded: score });
        })
      );
      await handleFinishReview();
    } catch (e) { console.error(e); }
  }, [id, currentQuestion, pendingAnswers, handleFinishReview]);

  const handleReturnToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    if (!id) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setParticipants([]);
    setLeaderboard([]);
    setCurrentQuestion(null, 0);
    setNeedsManualReview(false);

    getSessionById(id).then((s) => {
      setSession(s);
      if (s.quizId) {
        getQuestions(s.quizId).then((questions) => {
          setQuizQuestions(questions);
          setTotalQuestions(questions.length);
          getSessionState(id).then((state) => {
            if (state.currentQuestion) {
              const q = state.currentQuestion;
              const idx = questions.findIndex(
                (x: any) => x.id === q.id || x.Id === q.Id || (x.Id !== undefined && x.Id === q.id)
              );
              if (idx !== -1) setCurrentQuestionIndex(idx);
              const limit = state.timeLimit || q.timeLimit || q.TimeLimit || 30;
              const rem = typeof state.currentTimeRemaining === 'number' ? state.currentTimeRemaining : limit;
              setCurrentQuestion(q, limit, rem);
              setAnswersCount(state.currentAnswersCount || 0);
              if (state.isPaused !== undefined) {
                setTimerPaused(state.isPaused);
              }
              if (state.currentTimeRemaining === null || state.currentTimeRemaining === 0) {
                endQuestion();
              }
              if (state.needsManualReview) {
                setNeedsManualReview(true);
                setViewState('review');
                loadPendingAnswers();
              } else {
                setViewState('question');
              }
            }
          }).catch(console.error);
        }).catch(console.error);
      }
    }).catch(console.error);

    getParticipants(id).then(setParticipants).catch(console.error);

    return () => {
      clearShowResultsTimeout();
    };
  }, [id, setSession, setParticipants, setLeaderboard, setCurrentQuestion, setAnswersCount, endQuestion, setTimerPaused, setNeedsManualReview, loadPendingAnswers, clearShowResultsTimeout]);

  // Sliding-window preloader: preload the next 3 upcoming question images sequentially
  useEffect(() => {
    if (quizQuestions.length === 0) return;
    let cancelled = false;

    const startIdx = Math.max(0, currentQuestionIndex + 1);
    const endIdx = Math.min(quizQuestions.length, startIdx + 3);
    const urlsToPreload: string[] = [];

    for (let i = startIdx; i < endIdx; i++) {
      const q = quizQuestions[i];
      const rawPath = q?.imagePath || q?.ImagePath;
      if (rawPath) {
        const url = getImageUrl(rawPath);
        if (url && !preloadedUrlsRef.current.has(url)) {
          urlsToPreload.push(url);
        }
      }
    }

    const preloadSequentially = async () => {
      for (const url of urlsToPreload) {
        if (cancelled) break;
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => {
            preloadedUrlsRef.current.add(url);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        });
      }
    };

    preloadSequentially();

    return () => {
      cancelled = true;
    };
  }, [quizQuestions, currentQuestionIndex]);

  const handlers = {
    onPlayerJoined: (p: any) => addParticipant(p),
    onQuestionStarted: (question: any, timeLimit: number) => {
      clearShowResultsTimeout();
      setNeedsManualReview(false);
      setPendingAnswers([]);
      setCurrentQuestion(question, timeLimit || 30);
      setCurrentQuestionIndex((prev) => prev + 1);
      setViewState('question');
      setTimerPaused(false);
    },
    onLeaderboardUpdated: (data: any) => {
      clearShowResultsTimeout();
      endQuestion();
      setNeedsManualReview(false);
      setLeaderboard(Array.isArray(data) ? data : []);
      setViewState('leaderboard');
    },
    onManualReviewRequired: () => {
      clearShowResultsTimeout();
      endQuestion();
      setNeedsManualReview(true);
      setViewState('review');
      loadPendingAnswers();
    },
    onTimerTick: (data: { remainingSeconds: number }) => updateTimer(data.remainingSeconds),
    onTimerPaused: (data: { remainingSeconds: number }) => {
      setTimerPaused(true);
      updateTimer(data.remainingSeconds);
    },
    onTimerResumed: (data: { remainingSeconds: number }) => {
      setTimerPaused(false);
      updateTimer(data.remainingSeconds);
    },
    onAnswerSubmitted: () => incrementAnswerCount(),
    onImageHidden: () => setIsImageHidden(true),
    onQuestionFinished: () => {
      endQuestion();
      clearShowResultsTimeout();
      if (!useResultsStore.getState().needsManualReview && id) {
        showResultsTimeoutRef.current = setTimeout(async () => {
          showResultsTimeoutRef.current = null;
          if (!useResultsStore.getState().needsManualReview) {
            try { await api.post(`/gamesessions/${id}/show-results`); } catch (e) { console.error(e); }
          }
        }, 500);
      }
    },
    onReconnected: () => {
      console.log('[HostGamePage] SignalR reconnected. Re-fetching state and participants...');
      if (id) {
        getParticipants(id).then(setParticipants).catch(console.error);
        getSessionState(id).then((state) => {
          if (state?.currentAnswersCount !== undefined) {
            setAnswersCount(state.currentAnswersCount);
          }
        }).catch(console.error);
      }
    }
  };

  useGameHubConnection(id, handlers, {
    getToken: () => localStorage.getItem('token')
  });

  // Timer display comes from useGameTimer in QuestionDisplay (secondsRemaining)
  // SignalR onTimerTick is the only source of truth for store updates

  const session = useSessionStore((s) => s.session);

  if (!session) return <div className="p-8">Oyun yükleniyor...</div>;

  switch (viewState) {
    case 'review':
      return (
        <ManualReviewView
          pendingAnswers={pendingAnswers}
          onReview={handleReview}
          onFinish={handleFinishReview}
        />
      );
    case 'finalScreen':
      return <FinalScreenView onReturnToDashboard={handleReturnToDashboard} />;
    case 'leaderboard':
      return (
        <LeaderboardView
          entries={leaderboard.map((e) => ({
            participantId: e.ParticipantId || e.participantId,
            nickname: e.nickname || e.Nickname,
            totalScore: e.totalScore || e.TotalScore,
            scoreDelta: e.scoreDelta || e.ScoreDelta
          }))}
          onNextQuestion={handleNextQuestion}
          onFinishQuiz={handleFinishQuiz}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
        />
      );
    case 'question':
      return (
        <div className="bg-gray-50 flex flex-col h-screen max-h-screen overflow-hidden">
          <HostHeader
            viewState={viewState}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onExtend={handleExtend}
            onShowResults={handleShowResults}
            onHideImage={handleHideImage}
          />
          <main className="flex-1 p-2 md:p-3 flex flex-col min-h-0 overflow-hidden">
            <QuestionDisplay
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
            />
          </main>
        </div>
      );
    default:
      return (
        <div className="bg-gray-50 flex flex-col min-h-screen">
          <HostHeader
            viewState={viewState}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onExtend={handleExtend}
            onShowResults={handleShowResults}
            onHideImage={handleHideImage}
          />
          <main className="flex-1 p-8">
            <LobbyView onStart={handleStart} />
          </main>
        </div>
      );
  }
}
