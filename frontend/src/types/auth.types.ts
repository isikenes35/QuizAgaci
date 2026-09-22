export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'Creator' | 'Admin';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password?: string;
}
