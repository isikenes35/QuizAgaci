import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../stores/gameStore';
import { getSessionById, getParticipants } from '../services/api/gameApi';
import { gameHubService } from '../services/signalr/gameHubService';

export default function HostGamePage() {
  const { id } = useParams<{ id: string }>();
  const { session, setSession, participants, setParticipants, addParticipant } = useGameStore();

  useEffect(() => {
    // Standard Creator auth token is in localStorage via axios config implicitly, 
    // but signalR needs it explicitly.
    const token = localStorage.getItem('token');
    if (!token || !id) return;

    // Load initial data
    getSessionById(id).then(setSession).catch(console.error);
    getParticipants(id).then(setParticipants).catch(console.error);

    // Connect to SignalR
    gameHubService.connect(token).then(() => {
      gameHubService.onPlayerJoined((p) => {
        addParticipant(p);
      });
    });

    return () => {
      gameHubService.disconnect();
    };
  }, [id, setSession, setParticipants, addParticipant]);

  if (!session) return <div className="p-8">Loading host lobby...</div>;

  const joinUrl = `${window.location.origin}/`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-8 py-4 shadow flex justify-between items-center">
        <h1 className="text-2xl font-bold">{session.gameCode}</h1>
        <button className="bg-primary-500 text-white px-6 py-2 rounded font-bold hover:bg-primary-600">
          Start Game
        </button>
      </header>
      
      <main className="flex-1 flex p-8 gap-8">
        {/* Left Side - Access Info */}
        <div className="w-1/3 flex flex-col items-center justify-center bg-white rounded-xl shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Join at {joinUrl}</h2>
          <div className="bg-primary-50 p-4 border border-primary-100 rounded-lg mb-8">
            <p className="text-sm text-primary-600 font-semibold mb-1">Game Code</p>
            <p className="text-5xl font-black text-primary-600 tracking-widest uppercase">
              {session.gameCode}
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <QRCodeSVG value={`${joinUrl}?code=${session.gameCode}`} size={200} />
          </div>
        </div>

        {/* Right Side - Participants */}
        <div className="flex-1 bg-white rounded-xl shadow p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Players</h3>
            <div className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-700 text-xl">
              {participants.length}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {participants.map(p => (
                <div key={p.id} className="bg-gray-50 px-4 py-3 rounded-lg text-center border border-gray-200 font-semibold text-gray-700 shadow-sm animate-fade-in">
                  {p.nickname}
                </div>
              ))}
              {participants.length === 0 && (
                <div className="col-span-full text-center text-gray-400 mt-12 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  Waiting for players to join...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
