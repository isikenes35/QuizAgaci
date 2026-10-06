import { useEffect, useState } from 'react';
import { getQuizzes, deleteQuiz } from '../services/api/quizApi';
import { startGameSession } from '../services/api/gameApi';
import type { Quiz } from '../types/quiz.types';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2, Edit2 } from 'lucide-react';

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const navigate = useNavigate();

  const loadQuizzes = () => {
    getQuizzes().then(setQuizzes).catch(console.error);
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu quizi silmek istediğinize emin misiniz?")) {
      try {
        await deleteQuiz(id);
        loadQuizzes();
      } catch (err) {
        console.error("Failed to delete quiz", err);
      }
    }
  };

  const handlePlayQuiz = async (quizId: string) => {
    try {
      const session = await startGameSession(quizId);
      navigate(`/dashboard/host/${session.id}`);
    } catch (err) {
      console.error("Failed to start quiz session", err);
      alert("Oyun başlatılamadı. Konsolu kontrol edin.");
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Quizlerim</h1>
        <button 
          onClick={() => navigate('/dashboard/create')}
          className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Yeni Quiz Oluştur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-semibold mb-2">{quiz.title}</h2>
            <p className="text-gray-600 mb-4">{quiz.description || 'Açıklama yok'}</p>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">{quiz.status === 'Draft' ? 'Taslak' : quiz.status}</span>
              <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-4 flex gap-4 justify-end">
              <button 
                onClick={() => navigate(`/dashboard/editor/${quiz.id}`)}
                className="text-primary-600 hover:text-primary-700 p-1"
                title="Düzenle"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => handleDelete(quiz.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Sil"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => handlePlayQuiz(quiz.id)}
                className="text-green-600 hover:text-green-700 p-1 ml-auto border border-green-600 rounded-full flex items-center justify-center p-2 hover:bg-green-50"
                title="Oyna"
              >
                <Play size={20} className="ml-1" />
              </button>
            </div>
          </div>
        ))}
        {quizzes.length === 0 && (
          <p className="text-gray-500">Henüz hiç quiz oluşturmadınız.</p>
        )}
      </div>
    </div>
  );
}
