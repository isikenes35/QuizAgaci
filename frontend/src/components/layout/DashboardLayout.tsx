import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div>
      <header className="bg-white border-b h-16 flex items-center px-8 shadow-sm">
        <img src="/quizea_logo.svg" alt="Quiz Ağacı" className="h-8" />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
