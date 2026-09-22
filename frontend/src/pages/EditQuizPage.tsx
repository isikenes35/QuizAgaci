import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuiz } from '../services/api/quizApi';
import type { Quiz } from '../types/quiz.types';

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (id) {
      getQuiz(id).then(setQuiz).catch(console.error);
    }
  }, [id]);

  if (!quiz) return <div className="p-8">Loading editor...</div>;

  return (
    <div className="flex h-[calc(100vh-64px)]"> {/* Assuming 64px header */}
      {/* Left Sidebar - Question List */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4 text-gray-700">Questions</h3>
        <button className="w-full border-2 border-dashed border-gray-300 rounded-md py-2 text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors">
          + Add Question
        </button>
        {/* Question list will go here */}
      </div>

      {/* Main Content - Editor */}
      <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">{quiz.title} - Editor</h2>
            <p className="text-gray-500 mb-8">Select a question from the left or add a new one.</p>
            {/* QuestionForm component will go here */}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Settings */}
      <div className="w-72 bg-white border-l border-gray-200 p-4">
        <h3 className="font-semibold mb-4 text-gray-700">Quiz Settings</h3>
        {/* Settings form will go here */}
      </div>
    </div>
  );
}
