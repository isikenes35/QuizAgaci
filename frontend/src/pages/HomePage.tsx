import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinGame } from '../services/api/gameApi';
import { motion } from 'framer-motion';
import { playPop } from '../utils/audioSystem';
import {
  setPlayerToken,
  getSavedPlayerSession,
  getPlayerSessionToken,
  clearTokens,
  type SavedPlayerSession
} from '../utils/tokenHelper';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [gameCode, setGameCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [codeFromQR, setCodeFromQR] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedPlayerSession | null>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      setGameCode(cleanCode);
      setCodeFromQR(true);
      const existing = getSavedPlayerSession(cleanCode);
      if (existing) {
        setSavedSession(existing);
        setNickname(existing.nickname);
      } else {
        setTimeout(() => nicknameInputRef.current?.focus(), 100);
      }
    }
  }, [searchParams]);

  const handleGameCodeChange = (val: string) => {
    const clean = val.toUpperCase();
    setGameCode(clean);
    if (clean.length === 6) {
      const existing = getSavedPlayerSession(clean);
      if (existing) {
        setSavedSession(existing);
        setNickname(existing.nickname);
      } else {
        setSavedSession(null);
      }
    } else {
      setSavedSession(null);
    }
  };

  const handleResumeSession = useCallback(async (session: SavedPlayerSession) => {
    setError('');
    playPop();
    try {
      const response = await joinGame({
        gameCode: session.gameCode,
        nickname: session.nickname,
        sessionToken: session.sessionToken
      });
      setPlayerToken(response.token, response.sessionToken, session.gameCode, session.nickname);
      navigate(`/game/${session.gameCode}/lobby`);
    } catch (err: any) {
      clearTokens(session.gameCode);
      setSavedSession(null);
      setError(err.response?.data?.message || 'Oturum yenilenemedi, lütfen tekrar giriş yapın.');
    }
  }, [navigate]);

  const handleDismissSavedSession = useCallback((code: string) => {
    clearTokens(code);
    setSavedSession(null);
    setNickname('');
    setTimeout(() => nicknameInputRef.current?.focus(), 100);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    playPop();
    
    const cleanCode = gameCode.trim().toUpperCase();
    const cleanNick = nickname.trim();
    if (!cleanCode || !cleanNick) return;

    try {
      const existingSessionToken = getPlayerSessionToken(cleanCode) || undefined;
      const response = await joinGame({
        gameCode: cleanCode,
        nickname: cleanNick,
        sessionToken: existingSessionToken
      });

      setPlayerToken(response.token, response.sessionToken, cleanCode, cleanNick);
      navigate(`/game/${cleanCode}/lobby`);
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
          
          {/* Kayıtlı oturum varsa hızlı geri dönüş kartı */}
          {savedSession && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-sm"
            >
              <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider mb-1">
                Kayıtlı Oturum Bulundu
              </p>
              <p className="text-2xl font-black text-emerald-900 mb-3">{savedSession.nickname}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleResumeSession(savedSession)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition-colors text-base"
                >
                  Oyuna Geri Dön
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissSavedSession(savedSession.gameCode)}
                  className="px-3 py-3 text-xs text-gray-500 hover:text-gray-800 font-medium"
                >
                  Farklı İsim
                </button>
              </div>
            </motion.div>
          )}

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
                  onChange={(e) => handleGameCodeChange(e.target.value)}
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
