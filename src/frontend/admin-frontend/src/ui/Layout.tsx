import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

function useTheme() {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('admin_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin_theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
}

export default function Layout() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const token = localStorage.getItem('access_token');

  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full border-b px-4 py-3 flex items-center gap-4 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold">Панель администратора</h1>
        <nav className="flex gap-3 text-sm">
          <Link to="/admin" className="hover:underline">Dashboard</Link>
          <Link to="/auth/register" className="hover:underline">Register</Link>
          {token && <Link to="/admin/profile" className="hover:underline">Profile</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggle} className="px-3 py-1 rounded border text-sm">{theme === 'light' ? '🌙' : '☀️'}</button>
          {token ? (
            <button onClick={logout} className="px-3 py-1 rounded border text-sm">Logout</button>
          ) : (
            <Link to="/admin/login" className="px-3 py-1 rounded border text-sm">Login</Link>
          )}
        </div>
      </header>
      <main className="container mx-auto flex-1 w-full px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t px-4 py-4 text-center text-xs text-gray-600 dark:text-gray-400">© 2025 Admin Module</footer>
    </div>
  );
}
