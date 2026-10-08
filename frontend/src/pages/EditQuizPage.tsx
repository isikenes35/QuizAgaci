import { getImageUrl } from '../utils/imageHelper';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz, updateQuiz } from '../services/api/quizApi';
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

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
        setEditTitle(quizData.title);
        setQuestions(questionsData);
        setLoading(false);
      }).catch(console.error);
    }
  }, [id]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newQuestions = [...questions];
    const draggedItem = newQuestions[draggedIndex];
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);

    setQuestions(newQuestions);
    setDraggedIndex(null);

    const questionIds = newQuestions.map(q => q.id);
    try {
      if (id) {
         await import('../services/api/questionApi').then(m => m.reorderQuestions(id, questionIds));
      }
    } catch (err) {
      console.error('Failed to reorder', err);
    }
  };

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
        alert('Soru kaydedilirken hata oluştu: ' + (error.response?.data?.message || error.message));
      }
    };
  
    const handleDeleteQuestion = async (questionId: string) => {
      if (!confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
  
      try {
        await deleteQuestion(questionId);
        setQuestions(questions.filter(q => q.id !== questionId));
        if (selectedQuestion?.id === questionId) {
          setSelectedQuestion(null);
          setIsCreatingNew(false);
        }
      } catch (error) {
        console.error(error);
        alert('Soru silinemedi');
      }
    };

  const handleHostQuiz = async () => {
    if (!id || questions.length === 0) {
      alert('Sistem: Lütfen başlatmadan önce en az bir soru ekleyin.');
      return;
    }

    setIsStartingSession(true);
    try {
      const session = await startGameSession(id);
      navigate(`/dashboard/host/${session.id}`);
    } catch (error: any) {
      console.error(error);
      alert('Oyun başlatılamadı: ' + (error.response?.data?.message || error.message));
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

  const handleSaveTitle = async () => {
    if (!quiz || !editTitle.trim() || editTitle === quiz.title) {
      setIsEditingTitle(false);
      setEditTitle(quiz?.title || '');
      return;
    }
    
    try {
      const updated = await updateQuiz(quiz.id, {
        title: editTitle,
        description: quiz.description,
        language: quiz.language,
        defaultTimeLimit: quiz.defaultTimeLimit || 30,
        defaultMaxScore: quiz.defaultMaxScore || 1000,
        defaultSpeedBonus: quiz.defaultSpeedBonus ?? true,
        coverImagePath: quiz.coverImagePath,
        status: quiz.status
      });
      setQuiz(updated);
      setIsEditingTitle(false);
    } catch (e) {
      console.error(e);
      alert("Başlık güncellenemedi");
      setEditTitle(quiz.title);
      setIsEditingTitle(false);
    }
  };

  const updateOption = (index: number, field: 'optionText' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  if (loading) return <div className="p-8">Editör yükleniyor...</div>;
  if (!quiz) return <div className="p-8">Quiz bulunamadı</div>;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Sidebar - Question List */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <div className="mb-6 pb-4 border-b border-gray-100">
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') {
                  setEditTitle(quiz.title);
                  setIsEditingTitle(false);
                }
              }}
              className="w-full font-bold text-lg p-1 border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          ) : (
            <h2 
              className="font-bold text-lg text-gray-800 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors break-words"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit Quiz Title"
            >
              {quiz.title} <span className="text-gray-400 text-xs ml-1 inline-block">✎</span>
            </h2>
          )}
        </div>

          <h3 className="font-semibold mb-4 text-gray-700">Sorular ({questions.length})</h3>
          <button 
            onClick={handleAddQuestion}
            className="w-full border-2 border-dashed border-gray-300 rounded-md py-2 text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors mb-4 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Soru Ekle
          </button>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <div
              key={question.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => handleSelectQuestion(question)}
              className={`p-3 rounded-md cursor-pointer border transition-colors group ${
                selectedQuestion?.id === question.id
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-gray-50 border-gray-200 hover:border-primary-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-gray-400 cursor-grab hover:text-gray-600 self-start mt-1 mr-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9h16M4 15h16"/></svg></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">S{index + 1}</div>
                  <div className="text-sm font-medium truncate">{question.questionText || 'Başlıksız'}</div>
                  <div className="text-xs text-gray-400 mt-1">{question.type === 'MultipleChoice' ? 'Çoktan Seçmeli' : question.type === 'MultipleSelect' ? 'Çoklu Seçim' : question.type === 'TrueFalse' ? 'Doğru/Yanlış' : 'Açık Uçlu'}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteQuestion(question.id!);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                  title="Sil"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Soru Tipi</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      if (newType === 'TrueFalse') {
                        setFormData({ 
                          ...formData, 
                          type: newType,
                          options: [
                            { optionText: 'Doğru', isCorrect: true },
                            { optionText: 'Yanlış', isCorrect: false }
                          ]
                        });
                      } else {
                        setFormData({ ...formData, type: newType });
                      }
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                  >
                    <option value="MultipleChoice">Çoktan Seçmeli</option>
                    <option value="MultipleSelect">Çoklu Seçim</option>
                    <option value="TrueFalse">Doğru / Yanlış</option>
                    <option value="OpenEnded">Açık Uçlu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Soru Metni</label>
                  <textarea
                    required
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                    rows={3}
                    placeholder="Soru metninizi girin..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Soru Görseli (İsteğe Bağlı)</label>
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
                            console.error('Görsel yüklenemedi:', error);
                            alert('Görsel yüklenirken hata oluştu');
                          }
                        }}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                      />
                  {formData.imagePath && (
                      <div className="mt-2">
                        <img src={getImageUrl(formData.imagePath)} alt="Soru görseli önizleme" className="max-h-40 rounded border" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imagePath: undefined })}
                          className="mt-1 text-sm text-red-500 hover:text-red-700"
                        >
                          Görseli Kaldır
                        </button>
                    </div>
                  )}
                </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Süre Limiti (saniye)</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                    min={5}
                    max={300}
                  />
                </div>

                {(formData.type === 'MultipleChoice' || formData.type === 'MultipleSelect' || formData.type === 'TrueFalse' || formData.type === 'OpenEnded') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.type === 'OpenEnded' 
                          ? 'Kabul Edilebilir Cevaplar' 
                          : 'Cevap Seçenekleri'}
                      </label>
                      {formData.type === 'OpenEnded' && (
                        <p className="text-sm text-gray-500 mb-3">
                          Her satır bir kabul edilebilir cevaptır (büyük/küçük harf ve Türkçe karakter farkı gözetmez)
                        </p>
                      )}
                    <div className="space-y-3">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {formData.type !== 'OpenEnded' && (
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
                          )}
                          <input
                            type="text"
                            required
                            value={option.optionText}
                            onChange={(e) => {
                              updateOption(index, 'optionText', e.target.value);
                              // OpenEnded için tüm options'ı isCorrect=true yap
                              if (formData.type === 'OpenEnded') {
                                updateOption(index, 'isCorrect', true);
                              }
                            }}
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                              placeholder={formData.type === 'OpenEnded' ? `Kabul edilebilir cevap ${index + 1}` : `Seçenek ${index + 1}`}
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
                          {formData.type === 'OpenEnded' ? '+ Cevap Ekle' : '+ Seçenek Ekle'}
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
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 font-medium"
                    >
                      {isCreatingNew ? 'Soruyu Oluştur' : 'Değişiklikleri Kaydet'}
                    </button>
                  </div>
              </div>
            </form>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <h2 className="text-xl font-bold mb-4">{quiz.title} - Editör</h2>
                <p className="text-gray-500 mb-6">Başlamak için soldan bir soru seçin veya yeni bir tane ekleyin.</p>
                <button
                  onClick={handleAddQuestion}
                  className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  İlk Sorunuzu Ekleyin
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
              Kurucu Panosuna Dön
            </button>
            <button
              onClick={handleHostQuiz}
              disabled={isStartingSession}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingSession ? 'Başlatılıyor...' : 'Oyunu Başlat'}
            </button>
        </div>
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Quiz İstatistikleri</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Soru Sayısı: {questions.length}</div>
              <div>Durum: {quiz.status === 'Draft' ? 'Taslak' : quiz.status === 'Published' ? 'Yayında' : quiz.status}</div>
            </div>
          </div>
        </div>
    </div>
  );
}








