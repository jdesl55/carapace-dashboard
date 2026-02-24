import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-carapace-bg-deep">
      <Sidebar />
      <main className="ml-60 min-h-screen">
        <div className="max-w-[1200px] mx-auto p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
