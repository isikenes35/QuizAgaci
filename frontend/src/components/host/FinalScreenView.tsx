import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useResultsStore } from '../../stores/resultsStore';
import { playCelebration } from '../../utils/audioSystem';

interface FinalScreenViewProps {
  onReturnToDashboard: () => void;
}

export const FinalScreenView = memo(function FinalScreenView({ onReturnToDashboard }: FinalScreenViewProps) {
  const leaderboard = useResultsStore((s) => s.leaderboard);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    playCelebration();
    const duration = 3000;
    const end = Date.now() + duration;

    let raf = 0;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF4500']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF4500']
      });

      if (Date.now() < end) {
        raf = requestAnimationFrame(frame);
      }
    };

    frame();

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  const top3 = [...leaderboard].slice(0, 3);
  const p1 = top3[0];
  const p2 = top3[1];
  const p3 = top3[2];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      <motion.h2
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-600 mb-12 drop-shadow-2xl"
      >
        Quiz Tamamlandı!
      </motion.h2>

      <div className="flex justify-center items-end gap-6 h-64 mt-12 w-full max-w-4xl mx-auto px-4 z-10">
        {p2 && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center flex-1"
          >
            <span className="text-xl font-bold text-gray-200 truncate w-full text-center">
              {p2.nickname || p2.Nickname}
            </span>
            <div className="w-full bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-xl mt-2 h-32 shadow-[0_0_20px_rgba(209,213,219,0.3)] border-t border-gray-400">
              <div className="text-4xl text-center mt-4">🥈</div>
            </div>
          </motion.div>
        )}

        {p1 && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex flex-col items-center flex-1"
          >
            <span className="text-2xl font-bold text-yellow-300 truncate w-full text-center drop-shadow-md">
              {p1.nickname || p1.Nickname}
            </span>
            <div className="w-full bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-xl mt-2 h-48 shadow-[0_0_30px_rgba(250,204,21,0.5)] border-t border-yellow-200">
              <div className="text-5xl text-center mt-4">🥇</div>
            </div>
          </motion.div>
        )}

        {p3 && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0 }}
            className="flex flex-col items-center flex-1"
          >
            <span className="text-xl font-bold text-amber-600 truncate w-full text-center">
              {p3.nickname || p3.Nickname}
            </span>
            <div className="w-full bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-xl mt-2 h-24 shadow-[0_0_15px_rgba(217,119,6,0.3)] border-t border-amber-500">
              <div className="text-4xl text-center mt-4">🥉</div>
            </div>
          </motion.div>
        )}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        onClick={onReturnToDashboard}
        className="mt-16 px-8 py-3 bg-white text-gray-900 rounded-full font-bold shadow-xl hover:bg-gray-100 z-10"
      >
        Panoya Dön
      </motion.button>
    </div>
  );
});