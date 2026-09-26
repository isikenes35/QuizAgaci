import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinGame } from '../services/api/gameApi';

export default function HomePage() {
  const [gameCode, setGameCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await joinGame({ gameCode, nickname });
      sessionStorage.setItem('playerToken', response.token);
      navigate(`/game/${gameCode.toUpperCase()}/lobby`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join game');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="px-8 py-4 bg-white shadow-sm flex justify-between items-center relative z-50">
        <h1 className="text-2xl font-black text-primary-500 tracking-tight">QUIZ</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
            type="button"
          >
            Log in
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 cursor-pointer"
            type="button"
          >
            Sign up
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center -mt-16">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-center mb-6">Join a Game</h2>
          {error && <div className="mb-4 text-red-500 text-center text-sm font-medium">{error}</div>}
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <input
                type="text"
                required
                placeholder="Game Code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                className="w-full px-4 py-3 text-lg font-bold text-center uppercase tracking-widest border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors"
                maxLength={6}
              />
            </div>
            <div>
              <input
                type="text"
                required
                placeholder="Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 text-lg text-center border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors"
                maxLength={20}
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-primary-500 text-white text-xl font-bold rounded-lg hover:bg-primary-600 transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
