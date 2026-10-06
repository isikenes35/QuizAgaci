import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, error } = useAuthStore();
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    
    try {
      await login({ email, password });
      navigate('/dashboard'); // assuming /dashboard after login
    } catch (err: any) {
      setLocalError(err.response?.data?.message || error || 'Giriş yapılamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex justify-center mb-6">
          <img src="/quizea_logo.svg" alt="Quiz Ağacı" className="h-16" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Yönetici Girişi</h2>
        <p className="text-center text-gray-500 mb-8">Lütfen bilgilerinizi girin.</p>
        
        {(localError || error) && (
          <div className="mb-4 text-red-500 text-center text-sm font-medium p-3 bg-red-50 rounded-lg">
            {localError || error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors bg-white font-medium text-gray-900 placeholder-gray-400 outline-none"
              placeholder="E-posta adresinizi girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors bg-white font-medium text-gray-900 placeholder-gray-400 outline-none"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 bg-gray-900 text-white text-lg font-bold rounded-lg transition-colors mt-6 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          Sadece yetkili kullanıcılar quiz oluşturabilir. <br/>
          Hesap için yöneticiyle iletişime geçin.
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <Link to="/" className="hover:underline">
          &larr; Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
