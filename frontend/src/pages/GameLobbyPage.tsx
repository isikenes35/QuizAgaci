import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { gameHubService } from '../services/signalr/gameHubService';
import { getSessionByCode } from '../services/api/gameApi';

export default function GameLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { setSession } = useGameStore();

  useEffect(() => {
    const token = localStorage.getItem('playerToken');
    if (!token) {
      window.location.href = '/';
      return;
    }

    if (code) {
      getSessionByCode(code).then(setSession).catch(console.error);
    }

    // Connect to SignalR
    gameHubService.connect(token).then(() => {
      // Could send a 'PlayerReady' message if needed
    });

    return () => {
      gameHubService.disconnect();
    };
  }, [code, setSession]);

  return (
    <div className="min-h-screen bg-primary-500 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">You're in!</h2>
        <p className="text-gray-600 mb-8">See your nickname on screen?</p>
        
        <div className="animate-pulse flex space-x-2 items-center justify-center">
          <div className="w-3 h-3 bg-primary-400 rounded-full"></div>
          <div className="w-3 h-3 bg-primary-400 rounded-full"></div>
          <div className="w-3 h-3 bg-primary-400 rounded-full"></div>
        </div>
        
        <p className="mt-8 text-sm font-medium text-gray-400">Waiting for host to start...</p>
      </div>
    </div>
  );
}
