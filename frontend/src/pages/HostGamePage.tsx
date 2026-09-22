import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../stores/gameStore';
import { getSessionById, getParticipants } from '../services/api/gameApi';
import { getPendingAnswers, reviewAnswer, resumeFromReview } from '../services/api/answerApi';
import type { PendingAnswer } from '../types/answer.types';
import { gameHubService } from '../services/signalr/gameHubService';
import api from '../services/api/axiosConfig';

export default function HostGamePage() {
  const { id } = useParams<{ id: string }>();
  const { session, setSession, participants, setParticipants, addParticipant, currentQuestion, isQuestionActive, leaderboard, setLeaderboard, setNeedsManualReview } = useGameStore();

  const [viewState, setViewState] = useState<'lobby' | 'question' | 'leaderboard' | 'review'>('lobby');
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;

    getSessionById(id).then(setSession).catch(console.error);
    getParticipants(id).then(setParticipants).catch(console.error);

    gameHubService.connect(token).then(() => {
      gameHubService.onPlayerJoined((p) => {
        addParticipant(p);
      });
      gameHubService.onQuestionStarted(() => {
        setViewState('question');
      });
      gameHubService.onLeaderboardUpdated((data) => {
        setLeaderboard(data);
      });
      gameHubService.onManualReviewRequired(() => {
        setNeedsManualReview(true);
        setViewState('review');
        loadPendingAnswers();
      });
    });

    return () => {
      gameHubService.disconnect();
    };
  }, [id, setSession, setParticipants, addParticipant, setLeaderboard]);

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
      setViewState('question'); // Switch back or go straight to leaderboard if host prefers.
      // Easiest is to prompt host to click "Show Results" explicitly now.
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartNextQuestion = async () => {
    try {
      await api.post(`/gamesessions/${id}/next-question`);
    } catch (e) {
      console.error(e);
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

  if (!session) return <div className="p-8">Loading host lobby...</div>;

  const joinUrl = `${window.location.origin}/`;

  if (viewState === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-8">
        <h2 className="text-3xl font-bold text-center mb-4">Manual Review</h2>
        <p className="text-center text-gray-500 mb-8">Review the submitted answers before showing the leaderboard.</p>
        
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {pendingAnswers.map((ans) => (
            <div key={ans.answerId} className="bg-white p-6 rounded-xl shadow border border-gray-200 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">{ans.nickname}</p>
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
        <h2 className="text-3xl font-bold text-center mb-8">Leaderboard</h2>
        <div className="max-w-3xl mx-auto w-full bg-white rounded-xl shadow overflow-hidden animate-fade-in">
          {leaderboard.map((entry, index) => (
            <div key={entry.ParticipantId || entry.participantId} className={`flex items-center justify-between px-6 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-500' : 'text-gray-500'}`}>{index + 1}</span>
                <span className="text-lg font-semibold">{entry.Nickname || entry.nickname}</span>
              </div>
              <span className="text-2xl font-black text-primary-500">{entry.TotalScore || entry.totalScore}</span>
            </div>
          ))}
          {leaderboard.length === 0 && <div className="p-8 text-center text-gray-400">No participants yet</div>}
        </div>
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={handleStartNextQuestion} className="px-6 py-3 bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600">Next Question</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-8 py-4 shadow flex justify-between items-center">
        <h1 className="text-2xl font-bold">{session.gameCode}</h1>
        <div className="flex gap-4">
          {viewState === 'question' && !isQuestionActive && (
            <button onClick={handleShowResults} className="bg-blue-500 text-white px-6 py-2 rounded font-bold hover:bg-blue-600">
              Show Results
            </button>
          )}
          <button onClick={handleStartNextQuestion} className="bg-primary-500 text-white px-6 py-2 rounded font-bold hover:bg-primary-600">
            {viewState === 'lobby' ? 'Start Game' : 'Next Question'}
          </button>
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

        {viewState === 'question' && (
          <div className="flex flex-col items-center justify-center h-full text-center">
             <h2 className="text-4xl font-bold">Question in progress...</h2>
             <p className="mt-4 text-gray-500">Wait for time to finish to show results.</p>
          </div>
        )}
      </main>
    </div>
  );
}
