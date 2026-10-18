import { memo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useQuestionStore } from '../../stores/questionStore';

export type HostViewState = 'lobby' | 'question' | 'leaderboard' | 'review' | 'finalScreen';

interface HostHeaderProps {
  viewState: HostViewState;
  currentQuestionIndex: number;
  totalQuestions: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onShowResults: () => void;
  onHideImage: () => void;
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => console.error(err));
  } else {
    document.exitFullscreen().catch((err) => console.error(err));
  }
};

export const HostHeader = memo(function HostHeader({
  viewState,
  currentQuestionIndex,
  totalQuestions,
  onStart,
  onPause,
  onResume,
  onExtend,
  onShowResults,
  onHideImage
}: HostHeaderProps) {
  const gameCode = useSessionStore((s) => s.session?.gameCode);
  const isQuestionActive = useQuestionStore((s) => s.isQuestionActive);

  const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;

  return (
    <header className="bg-white px-4 md:px-6 py-2 md:py-2.5 shadow flex justify-between items-center flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-wider">
          {gameCode}
        </h1>
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
            <button
              onClick={onPause}
              className="bg-yellow-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-yellow-600"
            >
              Pause
            </button>
            <button
              onClick={onResume}
              className="bg-green-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-green-600"
            >
              Resume
            </button>
            <button
              onClick={onExtend}
              className="bg-purple-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-purple-600"
            >
              +10s
            </button>
            <button
              onClick={onShowResults}
              className="bg-red-500 text-white px-3 md:px-4 py-1.5 rounded font-bold text-sm md:text-base hover:bg-red-600"
            >
              {isLastQuestion ? 'Testi Bitir' : 'Soruyu Bitir'}
            </button>
          </>
        )}

        {viewState === 'question' && isQuestionActive && (
          <button
            onClick={onHideImage}
            className="bg-gray-800 text-white px-4 md:px-6 py-1.5 rounded font-bold text-sm md:text-base hover:bg-gray-900"
          >
            Görseli Gizle
          </button>
        )}
        {viewState === 'question' && !isQuestionActive && (
          <button
            onClick={onShowResults}
            className="bg-blue-500 text-white px-4 md:px-6 py-1.5 rounded font-bold text-sm md:text-base hover:bg-blue-600"
          >
            {isLastQuestion ? 'Sonuçları Gör' : 'Sonuçları Göster'}
          </button>
        )}
        {viewState === 'lobby' && (
          <button
            onClick={onStart}
            className="bg-primary-500 text-white px-6 py-2 rounded font-bold hover:bg-primary-600"
          >
            Oyunu Başlat
          </button>
        )}
      </div>
    </header>
  );
});
