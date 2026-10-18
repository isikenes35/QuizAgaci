import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Pages - lazy loaded for route-based code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CreateQuizPage = lazy(() => import('./pages/CreateQuizPage'));
const EditQuizPage = lazy(() => import('./pages/EditQuizPage'));
const GameLobbyPage = lazy(() => import('./pages/GameLobbyPage'));
const PlayerGamePage = lazy(() => import('./pages/PlayerGamePage'));
const HostGamePage = lazy(() => import('./pages/HostGamePage'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function LoadingSpinner() {
  return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <Suspense fallback={<LoadingSpinner />}>
            <HomePage />
          </Suspense>
        } />
        <Route path="/login" element={
          <Suspense fallback={<LoadingSpinner />}>
            <LoginPage />
          </Suspense>
        } />

        {/* Player Routes */}
        <Route path="/game/:code/lobby" element={
          <Suspense fallback={<LoadingSpinner />}>
            <GameLobbyPage />
          </Suspense>
        } />
        <Route path="/game/:code/play" element={
          <Suspense fallback={<LoadingSpinner />}>
            <PlayerGamePage />
          </Suspense>
        } />

        {/* Protected Creator Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <DashboardLayout />
            </Suspense>
          </ProtectedRoute>
        }>
          <Route index element={<Suspense fallback={<LoadingSpinner />}><DashboardPage /></Suspense>} />
          <Route path="create" element={<Suspense fallback={<LoadingSpinner />}><CreateQuizPage /></Suspense>} />
          <Route path="editor/:id" element={<Suspense fallback={<LoadingSpinner />}><EditQuizPage /></Suspense>} />
          <Route path="host/:id" element={<Suspense fallback={<LoadingSpinner />}><HostGamePage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
