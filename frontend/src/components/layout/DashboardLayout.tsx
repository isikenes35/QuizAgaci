import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div>
      <header className="bg-white border-b h-16 flex items-center px-8 shadow-sm">
        <h1 className="text-xl font-bold text-primary-500">Dashboard</h1>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
