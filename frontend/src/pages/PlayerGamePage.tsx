import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { gameHubService } from '../services/signalr/gameHubService';
import api from '../services/api/axiosConfig';

export default function PlayerGamePage() {
  const { currentQuestion, timeRemaining, updateTimer, endQuestion, isQuestionActive, session } = useGameStore();

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isQuestionActive) {
      // Waiting for next question or results... for now just stay or show waiting string
    }

    gameHubService.onTimerTick((data) => {
      updateTimer(data.remainingSeconds);
    });

    gameHubService.onQuestionFinished(() => {
      endQuestion();
    });

  }, [isQuestionActive, updateTimer, endQuestion]);

  const handleSubmit = async () => {
    if (!session || !currentQuestion) return;

    try {
      const response = await api.post('/answers/submit', {
        GameSessionId: session.id,
        QuestionId: currentQuestion.id || currentQuestion.Id,
        SelectedOptionIds: selectedOptions,
        TextAnswer: textAnswer
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('playerToken')}` }
      });
      
      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isQuestionActive && !currentQuestion) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white p-4 shadow text-center">
        <div className="text-3xl font-black text-gray-800">{timeRemaining}</div>
      </div>
      
      <main className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full">
        {!isQuestionActive && submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-gray-800">Time's Up!</h2>
            <p className="text-gray-500 mt-2">Waiting for everyone else...</p>
          </div>
        ) : submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-gray-800">Answer Submitted!</h2>
            <p className="text-gray-500 mt-2">Waiting for time to run out...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-center mt-8 mb-12">{currentQuestion.questionText || currentQuestion.QuestionText}</h2>
            
            {/* Options grid would go here, stubbed out for now */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button 
                 onClick={() => setSelectedOptions(['some-id'])}
                 className="p-8 bg-red-500 text-white rounded-xl shadow font-bold text-xl hover:bg-red-600 transition-colors"
               >
                 Option 1
               </button>
               <button 
                 onClick={() => setSelectedOptions(['some-id-2'])}
                 className="p-8 bg-blue-500 text-white rounded-xl shadow font-bold text-xl hover:bg-blue-600 transition-colors"
               >
                 Option 2
               </button>
            </div>
            
            <div className="mt-auto pt-8 pb-4">
              <button 
                onClick={handleSubmit}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-xl shadow"
                disabled={selectedOptions.length === 0 && !textAnswer}
              >
                Submit Answer
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
