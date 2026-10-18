import { memo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface LeaderboardEntry {
  participantId: string;
  nickname: string;
  totalScore: number;
  scoreDelta?: number;
}

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  onNextQuestion?: () => void;
  onFinishQuiz?: () => void;
  currentQuestionIndex: number;
  totalQuestions: number;
}

const EntryRow = memo(function EntryRow({
  entry,
  index,
  animate,
  delay
}: {
  entry: LeaderboardEntry;
  index: number;
  animate: boolean;
  delay: number;
}) {
  const isTop3 = index < 3;
  let rankColor = 'text-gray-500';
  let bgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
  let scaleClass = 'scale-100';

  if (index === 0) {
    rankColor = 'text-yellow-500';
    bgColor = 'bg-yellow-50 border-l-4 border-yellow-500';
    scaleClass = 'shadow-md z-10 relative';
  } else if (index === 1) {
    rankColor = 'text-gray-400';
    bgColor = 'bg-gray-100 border-l-4 border-gray-400';
    scaleClass = 'shadow-sm z-10 relative';
  } else if (index === 2) {
    rankColor = 'text-amber-600';
    bgColor = 'bg-amber-50 border-l-4 border-amber-600';
    scaleClass = 'shadow-sm z-10 relative';
  }

  const base = (
    <div
      className={`flex items-center justify-between px-8 py-5 transition-transform ${bgColor} ${scaleClass}`}
    >
      <div className="flex items-center gap-6">
        <span className={`text-4xl font-black ${rankColor} w-8 text-center`}>{index + 1}</span>
        <span className={`text-2xl font-bold ${isTop3 ? 'text-gray-900' : 'text-gray-700'}`}>
          {entry.nickname}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-3xl font-black text-primary-600">{entry.totalScore}</span>
        {entry.scoreDelta != null && entry.scoreDelta > 0 && (
          <span className="text-sm font-bold text-green-500">+{entry.scoreDelta}</span>
        )}
      </div>
    </div>
  );

  if (!animate) return base;

  return (
    <motion.div
      key={entry.participantId}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.02 }}
    >
      {base}
    </motion.div>
  );
});

export const LeaderboardView = memo(function LeaderboardView({
  entries,
  onNextQuestion,
  onFinishQuiz,
  currentQuestionIndex,
  totalQuestions
}: LeaderboardViewProps) {
  const prefersReduced = useReducedMotion();
  const animate = !prefersReduced && entries.length < 20;
  const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8">
      <motion.h2
        initial={prefersReduced ? false : { opacity: 0, y: -20 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        className="text-4xl font-black text-center mb-8 text-gray-800"
      >
        Liderlik Tablosu
      </motion.h2>
      <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {entries.length === 0 && (
          <div className="p-12 text-center text-gray-400 font-medium text-lg">
            Henüz katılımcı yok
          </div>
        )}
        {entries.map((entry, index) => (
          <EntryRow
            key={entry.participantId}
            entry={entry}
            index={index}
            animate={animate}
            delay={Math.min(index * 0.05, 0.3)}
          />
        ))}
      </div>
      <div className="flex justify-center mt-12 py-8">
        {!isLastQuestion ? (
          <button
            onClick={onNextQuestion}
            className="px-8 py-4 bg-primary-500 text-white rounded-xl font-black text-2xl shadow-lg hover:bg-primary-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            Sıradaki Soru
          </button>
        ) : (
          <button
            onClick={onFinishQuiz}
            className="px-8 py-4 bg-red-500 text-white rounded-xl font-black text-2xl shadow-lg hover:bg-red-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            Yarışmayı Bitir
          </button>
        )}
      </div>
    </div>
  );
});