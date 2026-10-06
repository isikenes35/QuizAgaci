import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz } from '../services/api/quizApi';

export default function CreateQuizPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const quiz = await createQuiz({ 
        title, 
        description, 
        language: 'tr',
        defaultTimeLimit: 30,
        defaultMaxScore: 1000,
        defaultSpeedBonus: true
      });
      navigate(`/dashboard/editor/${quiz.id}`);
    } catch (error) {
      console.error(error);
      alert('Quiz oluşturulamadı');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Yeni Quiz Oluştur</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Başlığı</label>
          <input 
            type="text" 
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-primary-500 focus:border-primary-500"
            placeholder="ör. Genel Kültür 2026"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-primary-500 focus:border-primary-500"
            rows={4}
          />
        </div>
        <div className="pt-4 flex justify-end gap-4">
          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
          >
            Oluştur ve Sorulara Geç
          </button>
        </div>
      </form>
    </div>
  );
}
