import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz } from '../services/api/quizApi';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../services/api/questionApi';
import { startGameSession } from '../services/api/gameApi';
import type { Quiz } from '../types/quiz.types';
import type { Question, QuestionType, CreateQuestionData } from '../types/question.types';
import { Trash2, Plus } from 'lucide-react';

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const [formData, setFormData] = useState<CreateQuestionData>({
    type: 'MultipleChoice',
    questionText: '',
    options: [
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ],
    timeLimit: 30,
  });

  useEffect(() => {
    if (id) {
      Promise.all([
        getQuiz(id),
        getQuestions(id)
      ]).then(([quizData, questionsData]) => {
        setQuiz(quizData);
        setQuestions(questionsData);
        setLoading(false);
      }).catch(console.error);
    }
  }, [id]);

  const handleAddQuestion = () => {
    setIsCreatingNew(true);
    setSelectedQuestion(null);
    setFormData({
      type: 'MultipleChoice',
      questionText: '',
      options: [
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
      ],
      timeLimit: 30,
    });
  };

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setIsCreatingNew(false);
    
    let options = question.options.map(opt => ({
      optionText: opt.optionText,
      isCorrect: opt.isCorrect
    }));

    if (question.type === 'TrueFalse' && options.length !== 2) {
      options = [
        { optionText: 'True', isCorrect: true },
        { optionText: 'False', isCorrect: false }
      ];
    }

    setFormData({
      type: question.type,
      questionText: question.questionText,
      options,
      timeLimit: question.timeLimit || 30,
      imagePath: question.imagePath || undefined,
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      console.log('Sending data:', formData);
      if (isCreatingNew) {
        const newQuestion = await createQuestion(id, formData);
        setQuestions([...questions, newQuestion]);
        setIsCreatingNew(false);
        setSelectedQuestion(newQuestion);
      } else if (selectedQuestion) {
        const updatedQuestion = await updateQuestion(selectedQuestion.id, formData);
        setQuestions(questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
        setSelectedQuestion(updatedQuestion);
      }
    } catch (error: any) {
      console.error('Full error:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to save question: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await deleteQuestion(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(null);
        setIsCreatingNew(false);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete question');
    }
  };

  const handleHostQuiz = async () => {
    if (!id || questions.length === 0) {
      alert('Please add at least one question before hosting.');
      return;
    }

    setIsStartingSession(true);
    try {
      const session = await startGameSession(id);
      navigate(`/dashboard/host/${session.id}`);
    } catch (error: any) {
      console.error('Failed to start session:', error);
      alert('Failed to start game session: ' + (error.response?.data?.message || error.message));
      setIsStartingSession(false);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { optionText: '', isCorrect: false }]
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const updateOption = (index: number, field: 'optionText' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  if (loading) return <div className="p-8">Loading editor...</div>;
  if (!quiz) return <div className="p-8">Quiz not found</div>;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Sidebar - Question List */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4 text-gray-700">Questions ({questions.length})</h3>
        <button 
          onClick={handleAddQuestion}
          className="w-full border-2 border-dashed border-gray-300 rounded-md py-2 text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors mb-4 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Question
        </button>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <div
              key={question.id}
              onClick={() => handleSelectQuestion(question)}
              className={`p-3 rounded-md cursor-pointer border transition-colors group ${
                selectedQuestion?.id === question.id
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-gray-50 border-gray-200 hover:border-primary-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">Q{index + 1}</div>
                  <div className="text-sm font-medium truncate">{question.questionText || 'Untitled'}</div>
                  <div className="text-xs text-gray-400 mt-1">{question.type}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteQuestion(question.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {(selectedQuestion || isCreatingNew) ? (
            <form onSubmit={handleSaveQuestion} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6">
                {isCreatingNew ? 'New Question' : 'Edit Question'}
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      if (newType === 'TrueFalse') {
                        setFormData({ 
                          ...formData, 
                          type: newType,
                          options: [
                            { optionText: 'True', isCorrect: true },
                            { optionText: 'False', isCorrect: false }
                          ]
                        });
                      } else {
                        setFormData({ ...formData, type: newType });
                      }
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                  >
                    <option value="MultipleChoice">Multiple Choice</option>
                    <option value="MultipleSelect">Multiple Select</option>
                    <option value="TrueFalse">True/False</option>
                    <option value="OpenEnded">Open Ended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                  <textarea
                    required
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                    rows={3}
                    placeholder="Enter your question..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const formDataUpload = new FormData();
                      formDataUpload.append('file', file);
                      
                      try {
                        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api'}/files/upload/question-image`, {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                          },
                          body: formDataUpload
                        });
                        
                        const data = await response.json();
                        setFormData({ ...formData, imagePath: data.url });
                      } catch (error) {
                        console.error('Image upload failed:', error);
                        alert('Failed to upload image');
                      }
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                  />
                  {formData.imagePath && (
                    <div className="mt-2">
                      <img src={formData.imagePath} alt="Question preview" className="max-h-40 rounded border" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imagePath: undefined })}
                        className="mt-1 text-sm text-red-500 hover:text-red-700"
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                    min={5}
                    max={300}
                  />
                </div>

                {(formData.type === 'MultipleChoice' || formData.type === 'MultipleSelect' || formData.type === 'TrueFalse') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                    <div className="space-y-3">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type={formData.type === 'MultipleChoice' || formData.type === 'TrueFalse' ? 'radio' : 'checkbox'}
                            checked={option.isCorrect}
                            onChange={(e) => {
                              if (formData.type === 'MultipleChoice' || formData.type === 'TrueFalse') {
                                const newOptions = formData.options.map((opt, i) => ({
                                  ...opt,
                                  isCorrect: i === index
                                }));
                                setFormData({ ...formData, options: newOptions });
                              } else {
                                updateOption(index, 'isCorrect', e.target.checked);
                              }
                            }}
                            className="w-5 h-5 text-primary-500"
                          />
                          <input
                            type="text"
                            required
                            value={option.optionText}
                            onChange={(e) => updateOption(index, 'optionText', e.target.value)}
                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                            placeholder={`Option ${index + 1}`}
                            readOnly={formData.type === 'TrueFalse'}
                          />
                          {formData.options.length > 2 && formData.type !== 'TrueFalse' && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {formData.options.length < 6 && formData.type !== 'TrueFalse' && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="mt-3 text-sm text-primary-500 hover:text-primary-700 font-medium"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setSelectedQuestion(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 font-medium"
                  >
                    {isCreatingNew ? 'Create Question' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <h2 className="text-xl font-bold mb-4">{quiz.title} - Editor</h2>
              <p className="text-gray-500 mb-6">Select a question from the left or add a new one to get started.</p>
              <button
                onClick={handleAddQuestion}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add Your First Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Actions */}
      <div className="w-72 bg-white border-l border-gray-200 p-4">
        <h3 className="font-semibold mb-4 text-gray-700">Quiz Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            Back to Dashboard
          </button>
          <button
            onClick={handleHostQuiz}
            disabled={isStartingSession}
            className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStartingSession ? 'Starting...' : 'Host Quiz'}
          </button>
        </div>
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Quiz Stats</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Questions: {questions.length}</div>
            <div>Status: {quiz.status}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
