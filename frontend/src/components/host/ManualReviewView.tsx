import { memo, useState } from 'react';
import type { PendingAnswer } from '../../types/answer.types';

interface ManualReviewViewProps {
  pendingAnswers: PendingAnswer[];
  onReview: (selectedCorrectIds: string[]) => void;
  onFinish: () => void;
}

export const ManualReviewView = memo(function ManualReviewView({
  pendingAnswers,
  onReview,
  onFinish
}: ManualReviewViewProps) {
  const [selectedCorrectAnswers, setSelectedCorrectAnswers] = useState<string[]>([]);

  const toggleAnswer = (answerId: string) => {
    setSelectedCorrectAnswers((prev) =>
      prev.includes(answerId) ? prev.filter((id) => id !== answerId) : [...prev, answerId]
    );
  };

  const handleFinish = async () => {
    onReview(selectedCorrectAnswers);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8">
      <h2 className="text-3xl font-bold text-center mb-4">Manuel Değerlendirme</h2>
      <p className="text-center text-gray-500 mb-8">Gönderilen cevapları inceleyin. Doğru olanları seçin.</p>

      <div className="max-w-3xl mx-auto w-full space-y-4">
        {pendingAnswers.map((ans, index) => {
          const isSelected = selectedCorrectAnswers.includes(ans.answerId);
          return (
            <div
              key={ans.answerId}
              onClick={() => toggleAnswer(ans.answerId)}
              className={`p-6 rounded-xl shadow border flex justify-between items-center cursor-pointer transition-colors ${
                isSelected ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">Oyuncu {index + 1}</p>
                <p className="text-xl font-medium">{ans.textAnswer}</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="w-6 h-6 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
              </div>
            </div>
          );
        })}

        {pendingAnswers.length > 0 && (
          <div className="text-center mt-8 pt-4">
            <button
              onClick={handleFinish}
              className="w-full px-8 py-4 bg-primary-500 text-white rounded-xl font-black text-2xl shadow-lg hover:bg-primary-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Seçilenleri Doğru İşaretle ve Devam Et
            </button>
          </div>
        )}

        {pendingAnswers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-2xl font-bold text-gray-800 mb-4">Tüm cevaplar incelendi!</p>
            <button
              onClick={onFinish}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600 transition-colors"
            >
              Oyuna Devam Et
            </button>
          </div>
        )}
      </div>
    </div>
  );
});