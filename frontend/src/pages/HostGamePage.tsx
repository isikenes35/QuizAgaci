import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { useQuestionStore } from '../stores/questionStore';
import { useResultsStore } from '../stores/resultsStore';
import { useGameHubConnection } from '../hooks/useGameHubConnection';
import { getSessionById, getParticipants, hideImage, getSessionState } from '../services/api/gameApi';
import { getQuestions } from '../services/api/questionApi';
import { getPendingAnswers, resumeFromReview, reviewAnswer } from '../services/api/answerApi';
import api from '../services/api/axiosConfig';
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
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

  const handleStart = useCallback(async () => {
    if (!id) return;
    try {
      await api.post(`/gamesessions/${id}/next-question`);
      setViewState('question');
    } catch (e: any) {
      console.error('Start Game Error:', e.response?.data || e.message);
      alert('Failed to start next question: ' + (e.response?.data?.message || e.message));
    }
  }, [id]);

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
    try { await api.post(`/gamesessions/${id}/show-results`); } catch (e) { console.error(e); }
  }, [id]);

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
      await api.post(`/gamesessions/${id}/next-question`);
      setViewState('question');
    } catch (e: any) {
      console.error(e);
    }
  }, [id]);

  const loadPendingAnswers = useCallback(async () => {
    if (!id) return;
    try {
      const answers = await getPendingAnswers(id);
      setPendingAnswers(answers);
    } catch (e) { console.error(e); }
  }, [id]);

  const handleFinishReview = useCallback(async () => {
    if (!id) return;
    try {
      await resumeFromReview(id);
      setNeedsManualReview(false);
      setPendingAnswers([]);
      setTimeout(async () => {
        try { await api.post(`/gamesessions/${id}/show-results`); } catch (e) { console.error(e); }
      }, 500);
    } catch (e) { console.error(e); }
  }, [id, setNeedsManualReview]);

  const handleReview = useCallback(async (selectedCorrectIds: string[]) => {
    if (!id || !currentQuestion) return;
    try {
      await Promise.all(
        pendingAnswers.map((ans) => {
          const isCorrect = selectedCorrectIds.includes(ans.answerId);
          const score = isCorrect ? (currentQuestion.maxScore ?? 2000) : 0;
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
          setTotalQuestions(questions.length);
          getSessionState(id).then((state) => {
            if (state.currentQuestion) {
              const q = state.currentQuestion;
              const idx = questions.findIndex(
                (x: any) => x.id === q.id || x.Id === q.Id || (x.Id !== undefined && x.Id === q.id)
              );
              if (idx !== -1) setCurrentQuestionIndex(idx);
              setCurrentQuestion(q, state.currentTimeRemaining || 30);
              setAnswersCount(state.currentAnswersCount || 0);
              if (state.isPaused !== undefined) {
                setTimerPaused(state.isPaused);
              }
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
  }, [id, setSession, setParticipants, setCurrentQuestion, setAnswersCount, endQuestion, setTimerPaused]);

  const handlers = {
    onPlayerJoined: (p: any) => addParticipant(p),
    onQuestionStarted: (question: any, timeLimit: number) => {
      setCurrentQuestion(question, timeLimit || 30);
      setCurrentQuestionIndex((prev) => prev + 1);
      setViewState('question');
      setTimerPaused(false);
    },
    onLeaderboardUpdated: (data: any) => {
      setLeaderboard(data);
      setViewState('leaderboard');
    },
    onManualReviewRequired: () => {
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
      if (!useResultsStore.getState().needsManualReview && id) {
        setTimeout(async () => {
          try { await api.post(`/gamesessions/${id}/show-results`); } catch (e) { console.error(e); }
        }, 1000);
      }
    }
  };

  useGameHubConnection(id, handlers);

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
