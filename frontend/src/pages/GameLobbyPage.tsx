import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../stores/questionStore';
import { useSessionStore } from '../stores/sessionStore';
import { useGameHubConnection } from '../hooks/useGameHubConnection';
import { getSessionByCode } from '../services/api/gameApi';
import { motion } from 'framer-motion';

export default function GameLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const setSession = useSessionStore((s) => s.setSession);
  const setCurrentQuestion = useQuestionStore((s) => s.setCurrentQuestion);
  const isQuestionActive = useQuestionStore((s) => s.isQuestionActive);
  const session = useSessionStore((s) => s.session);

  const handleQuestionStarted = useCallback((question: any, timeLimit: number) => {
    setCurrentQuestion(question, timeLimit);
  }, [setCurrentQuestion]);

  const handlers = {
    onQuestionStarted: handleQuestionStarted
  };

  const sessionId = session?.id;

  useGameHubConnection(sessionId, handlers, {
    getToken: () => sessionStorage.getItem('playerToken'),
    enabled: !!sessionId
  });

  useEffect(() => {
    const token = sessionStorage.getItem('playerToken');
    if (!token) {
      window.location.href = '/';
      return;
    }

    if (code) {
      getSessionByCode(code).then(setSession).catch(console.error);
    }
  }, [code, setSession]);

  useEffect(() => {
    if (isQuestionActive) {
      navigate(`/game/${code}/play`);
    }
  }, [isQuestionActive, navigate, code]);

  return (
    <div className="min-h-screen bg-primary-500 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-2">İçerideyiz!</h2>
        <p className="text-gray-600 mb-8">Ekranda ismini görebiliyor musun?</p>

        <div className="flex space-x-2 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              className="w-3 h-3 bg-primary-400 rounded-full"
            />
          ))}
        </div>

        <p className="mt-8 text-sm font-medium text-gray-400">Sunucunun oyunu başlatması bekleniyor...</p>
      </motion.div>
    </div>
  );
}