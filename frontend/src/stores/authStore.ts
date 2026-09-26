import { create } from 'zustand';
import type { AuthState, LoginCredentials, RegisterCredentials } from '../types/auth.types';
import api from '../services/api/axiosConfig';
import { setCreatorToken, clearTokens } from '../utils/tokenHelper';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      const { token } = response.data;
      setCreatorToken(token);
      
      // Fetch user profile
      const userResponse = await api.get('/auth/me');
      
      set({ 
        user: userResponse.data,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Login failed' 
      });
      throw error;
    }
  },

  register: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', credentials);
      const { token } = response.data;
      setCreatorToken(token);
      
      const userResponse = await api.get('/auth/me');
      
      set({ 
        user: userResponse.data,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Registration failed' 
      });
      throw error;
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      set({ 
        user: response.data, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  }
}));
