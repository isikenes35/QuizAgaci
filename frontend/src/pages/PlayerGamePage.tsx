import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { gameHubService } from '../services/signalr/gameHubService';
import api from '../services/api/axiosConfig';
import { getSessionState } from '../services/api/gameApi';

export default function PlayerGamePage() {
  const { currentQuestion, timeRemaining, updateTimer, endQuestion, isQuestionActive, session, questionResults, setQuestionResults, needsManualReview, setNeedsManualReview, setIsImageHidden, setCurrentQuestion } = useGameStore();

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Attempt state recovery on mount
    if (session?.id) {
      const sId = session.id;
      getSessionState(sId).then((state) => {
        if (state.currentQuestion) {
          setCurrentQuestion(state.currentQuestion, state.currentTimeRemaining || 30);
          updateTimer(state.currentTimeRemaining || 0);
          if (state.currentTimeRemaining === null || state.currentTimeRemaining === 0) {
            endQuestion();
          }
          setIsImageHidden(state.isImageHidden);
        }
      }).catch(console.error);
    }

    const token = sessionStorage.getItem('playerToken');
    const sessionId = session?.id || new URLSearchParams(window.location.search).get('sessionId');
    
    if (token && sessionId) {
      gameHubService.connect(token, sessionId).catch(console.error);
    }

    gameHubService.onQuestionStarted((question, timeLimit) => {
      setCurrentQuestion(question, timeLimit || 30);
      setSubmitted(false);
      setSelectedOptions([]);
      setTextAnswer('');
    });

    gameHubService.onTimerTick((data) => {
      updateTimer(data.remainingSeconds);
    });

    gameHubService.onQuestionFinished(() => {
      endQuestion();
    });

    gameHubService.onShowQuestionResults((data) => {
      setQuestionResults(data);
    });

    gameHubService.onManualReviewRequired(() => {
      setNeedsManualReview(true);
    });

    gameHubService.onGameResumed(() => {
      setNeedsManualReview(false);
    });

    gameHubService.onImageHidden(() => {
      setIsImageHidden(true);
    });

  }, [updateTimer, endQuestion, setQuestionResults, setNeedsManualReview, setIsImageHidden, session, setCurrentQuestion]);

  const handleSubmit = async () => {
    if (!session || !currentQuestion) return;

    try {
      const response = await api.post('/answers/submit', {
        GameSessionId: session.id,
        QuestionId: currentQuestion.id || currentQuestion.Id,
        SelectedOptionIds: selectedOptions,
        TextAnswer: textAnswer
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('playerToken')}` }
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

  // If results are out
  if (questionResults) {
    const isCorrect = questionResults.correctOptionIds?.some((id: string) => selectedOptions.includes(id));
    
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
        <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md w-full">
          <h2 className={`text-4xl font-black mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h2>
          <p className="text-gray-600 font-medium mb-6">
            {questionResults.explanation || (isCorrect ? 'Great job!' : 'Better luck next time!')}
          </p>
          <p className="text-sm text-gray-400 mt-4">Waiting for next question...</p>
        </div>
      </div>
    );
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
        ) : submitted && needsManualReview ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-gray-800">⏳ Cevaplar değerlendiriliyor...</h2>
            <p className="text-gray-500 mt-2">The host is manually reviewing the answers. Please wait.</p>
          </div>
        ) : submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-gray-800">Answer Submitted!</h2>
            <p className="text-gray-500 mt-2">Waiting for time to run out...</p>
          </div>
        ) : (
          <>
            <div className="text-center py-4">
               <p className="text-gray-500 font-medium">Lütfen ana ekrana (Host) bakınız.</p>
            </div>
            
            {/* Dynamic question type rendering */}
            {currentQuestion.type === 'OpenEnded' ? (
              <div className="mb-8 mt-4">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Cevabınızı buraya yazın..."
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-primary-600 focus:outline-none min-h-[200px] text-lg"
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-2 text-right">{textAnswer.length}/500</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 h-64">
                {currentQuestion.options?.map((option: any) => {
                  const optionId = option.id || option.Id;
                  const optionText = option.optionText || option.OptionText;
                  const isSelected = selectedOptions.includes(optionId);
                  const isMultiSelect = currentQuestion.type === 'MultipleSelect';

                  const handleOptionSelect = () => {
                    if (isMultiSelect) {
                      setSelectedOptions(prev =>
                        prev.includes(optionId)
                          ? prev.filter(id => id !== optionId)
                          : [...prev, optionId]
                      );
                    } else {
                      setSelectedOptions([optionId]);
                    }
                  };

                  return (
                    <button
                      key={optionId}
                      onClick={handleOptionSelect}
                      className={`p-6 rounded-xl shadow-md font-bold text-xl transition-all flex items-center justify-center text-gray-800 border-2 ${
                        isSelected
                          ? `bg-primary-100 border-primary-500 ring-4 ring-primary-200 scale-95`
                          : `bg-white border-gray-300 hover:bg-gray-50`
                      }`}
                    >
                      {isMultiSelect && (
                        <span className="mr-3 text-2xl">{isSelected ? '☑' : '☐'}</span>
                      )}
                      {optionText}
                    </button>
                  );
                })}
              </div>
            )}
            
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
