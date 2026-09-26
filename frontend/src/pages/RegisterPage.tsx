import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const { register, error } = useAuthStore();
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await register({ fullName, email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || error || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-center mb-6">Sign up for QUIZ</h2>
        <p className="text-center text-gray-500 mb-8">Create your account to start creating quizzes.</p>
        
        {(localError || error) && (
          <div className="mb-4 text-red-500 text-center text-sm font-medium p-3 bg-red-50 rounded-lg">
            {localError || error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors bg-white font-medium text-gray-900 placeholder-gray-400 outline-none"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors bg-white font-medium text-gray-900 placeholder-gray-400 outline-none"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors bg-white font-medium text-gray-900 placeholder-gray-400 outline-none"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors bg-white font-medium text-gray-900 placeholder-gray-400 outline-none"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 bg-gray-900 text-white text-lg font-bold rounded-lg transition-colors mt-6 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-gray-900 hover:underline">
            Log in
          </Link>
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <Link to="/" className="hover:underline">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
