import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinGame } from '../services/api/gameApi';
import { motion } from 'framer-motion';
import { playPop } from '../utils/audioSystem';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [gameCode, setGameCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [codeFromQR, setCodeFromQR] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setGameCode(code.toUpperCase());
      setCodeFromQR(true);
      // Auto-focus nickname input
      setTimeout(() => nicknameInputRef.current?.focus(), 100);
    }
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    playPop();
    
    try {
      const response = await joinGame({ gameCode, nickname });
      sessionStorage.setItem('playerToken', response.token);
      navigate(`/game/${gameCode.toUpperCase()}/lobby`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Oyuna katılamadınız');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="px-8 py-4 bg-white shadow-sm flex justify-end items-center relative z-50">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => { playPop(); navigate('/login'); }}
          className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
          type="button"
        >
          Yönetici Girişi
        </motion.button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center -mt-16 px-4">
        {/* Logo - formun üstünde */}
        <motion.img 
          src="/quizea_logo.svg" 
          alt="Quiz Ağacı" 
          className="h-20 mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
          className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-100"
        >
          <h2 className="text-2xl font-bold text-center mb-6">Oyuna Katıl</h2>
          {error && <div className="mb-4 text-red-500 text-center text-sm font-medium">{error}</div>}
          
          <form onSubmit={handleJoin} className="space-y-4">
            {/* QR'dan geldiyse oyun kodunu badge olarak göster */}
            {codeFromQR && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-center">
                <p className="text-xs text-primary-600 font-semibold mb-1">Oyun Kodu</p>
                <p className="text-2xl font-black text-primary-600 tracking-widest">{gameCode}</p>
              </div>
            )}
            
            {/* Oyun kodu inputu - sadece manuel giriş için göster */}
            {!codeFromQR && (
              <div>
                <input
                  type="text"
                  required
                  placeholder="Oyun Kodu"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  className="w-full px-4 py-3 text-lg font-bold text-center uppercase tracking-widest border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors"
                  maxLength={6}
                />
              </div>
            )}
            
            <div>
              <input
                ref={nicknameInputRef}
                type="text"
                required
                placeholder="Kullanıcı Adı"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 text-lg text-center border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors"
                maxLength={20}
              />
            </div>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full py-4 bg-primary-500 text-white text-xl font-bold rounded-lg hover:bg-primary-600 transition-colors"
            >
              Giriş Yap
            </motion.button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
