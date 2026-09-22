import { useEffect, useState } from 'react';
import { getQuizzes } from '../services/api/quizApi';
import type { Quiz } from '../types/quiz.types';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getQuizzes().then(setQuizzes).catch(console.error);
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Quizzes</h1>
        <button 
          onClick={() => navigate('/dashboard/create')}
          className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Create Quiz
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-semibold mb-2">{quiz.title}</h2>
            <p className="text-gray-600 mb-4">{quiz.description || 'No description'}</p>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">{quiz.status}</span>
              <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => navigate(`/dashboard/editor/${quiz.id}`)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Edit
              </button>
              <button className="text-green-600 hover:text-green-700 font-medium">Play</button>
            </div>
          </div>
        ))}
        {quizzes.length === 0 && (
          <p className="text-gray-500">You haven't created any quizzes yet.</p>
        )}
      </div>
    </div>
  );
}
