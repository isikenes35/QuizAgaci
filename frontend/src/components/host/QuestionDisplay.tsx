import { memo, useRef } from 'react';
import { useQuestionStore } from '../../stores/questionStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useGameTimer } from '../../hooks/useGameTimer';
import { OptimizedImage } from '../common/OptimizedImage';
import { calculateCurrentScore } from '../../utils/scoring';

interface QuestionDisplayProps {
  currentQuestionIndex: number;
  totalQuestions: number;
}

export const QuestionDisplay = memo(function QuestionDisplay({
  currentQuestionIndex,
  totalQuestions
}: QuestionDisplayProps) {
  const currentQuestion = useQuestionStore((s) => s.currentQuestion);
  const timeRemaining = useQuestionStore((s) => s.timeRemaining);
  const timeLimit = useQuestionStore((s) => s.timeLimit);
  const isImageHidden = useQuestionStore((s) => s.isImageHidden);
  const answersCount = useQuestionStore((s) => s.answersCount);
  const isQuestionActive = useQuestionStore((s) => s.isQuestionActive);
  const participantsList = useSessionStore((s) => s.participants);

  const barRef = useRef<HTMLDivElement>(null);
  const { secondsRemaining } = useGameTimer({
    duration: timeLimit || 30,
    serverRemaining: isQuestionActive ? timeRemaining : null,
    active: isQuestionActive,
    barRef
  });

  // Use secondsRemaining from hook for smooth display, timeRemaining from store for calculations
  const displayTimeRemaining = secondsRemaining;

  if (!currentQuestion) return null;

  const hasImage = Boolean(
    (currentQuestion.imagePath || currentQuestion.ImagePath) && !isImageHidden
  );
  const currentPotentialScore = calculateCurrentScore(displayTimeRemaining, timeLimit || 30);

  const imageSrc = currentQuestion.imagePath || currentQuestion.ImagePath;
  const questionText = currentQuestion.questionText || currentQuestion.QuestionText;
  const rawOptions = currentQuestion.options || currentQuestion.Options;
  const questionOptions = Array.isArray(rawOptions) ? rawOptions : [];
  const questionType = String(currentQuestion.type || currentQuestion.Type || '').toLowerCase();
  const hasOptions = questionOptions.length > 0 && questionType !== 'openended';

  const allAnswered = answersCount === participantsList.length && participantsList.length > 0;

  return (
    <div className="flex flex-col items-center flex-1 min-h-0 w-full max-w-[96vw] 2xl:max-w-[92vw] mx-auto justify-between">
      {/* Top bar and meta */}
      <div className="w-full flex-shrink-0">
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden shadow-inner">
          <div
            ref={barRef}
            className="bg-primary-500 h-2 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(displayTimeRemaining / Math.max(timeLimit || 30, 1)) * 100}%` }}
          />
        </div>

        <div className="flex justify-between w-full mb-1 items-center px-1">
          <div className="flex items-center gap-2.5">
            <span className="text-gray-500 font-extrabold text-sm md:text-base uppercase tracking-wider">
              Soru {currentQuestionIndex + 1} / {totalQuestions || '?'}
            </span>
            <span className="text-primary-600 font-bold text-xs md:text-sm bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
              Cevaplar: {answersCount} / {participantsList.length}
              {allAnswered && ' (Tamamlandı)'}
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full border border-primary-200 font-bold text-sm md:text-base flex items-center gap-1.5 shadow-sm">
              <span>⚡</span>
              <span>{currentPotentialScore} Puan</span>
            </div>
            <div className="bg-white px-4 py-0.5 rounded-full shadow border-2 border-gray-100 min-w-[60px] text-center">
              <span
                className={`text-2xl md:text-3xl font-black ${
                  displayTimeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'
                }`}
              >
                {displayTimeRemaining}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Question text */}
      <h2
        className={`${
          hasImage ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl my-1' : 'text-3xl md:text-5xl lg:text-6xl my-auto'
        } font-black text-center text-gray-900 leading-snug px-4 max-w-6xl flex-shrink-0 line-clamp-2`}
      >
        {questionText}
      </h2>

      {/* Image area */}
      {hasImage && (
        <div className="w-full flex-1 min-h-0 bg-white p-2 md:p-3 rounded-2xl shadow-md border border-gray-100 my-1 md:my-1.5 flex items-center justify-center overflow-hidden">
          <OptimizedImage
            src={imageSrc}
            alt="Soru görseli"
            imgClassName="w-full h-full max-h-full max-w-full object-contain rounded-xl"
          />
        </div>
      )}

      {/* Image hidden placeholder */}
      {imageSrc && isImageHidden && (
        <div className="w-full flex-1 min-h-0 bg-gray-100 p-4 rounded-2xl shadow-inner border border-gray-200 my-2 flex items-center justify-center">
          <span className="text-xl md:text-2xl font-bold text-gray-400">Görsel şu an gizli</span>
        </div>
      )}

      {/* Options */}
      {hasOptions && (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 w-full flex-shrink-0 ${
            hasImage ? 'mt-1' : 'my-auto max-w-5xl'
          }`}
        >
          {questionOptions.map((option: any, optIdx: number) => {
            if (!option) return null;
            const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
            const bgColor = colors[optIdx % colors.length];
            const optionText = option.optionText ?? option.OptionText ?? (typeof option === 'string' ? option : `Şık ${optIdx + 1}`);
            const optionKey = option.id ?? option.Id ?? String(optIdx);
            return (
              <div
                key={optionKey}
                className={`${bgColor} text-white px-4 py-2 md:py-3 rounded-xl shadow min-h-[46px] md:min-h-[52px] max-h-[64px] flex items-center justify-center text-center`}
              >
                <span className="text-base md:text-lg lg:text-xl font-bold drop-shadow-sm line-clamp-2">
                  {optionText}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});