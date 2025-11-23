import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '../services/api';

export default function Profile() {
  const { data: user, isLoading } = useQuery({ queryKey: ['currentUser'], queryFn: fetchCurrentUser });

  if (isLoading) return <p className="text-sm">Загрузка...</p>;
  if (!user) return <p className="text-sm text-red-600">Не удалось получить профиль.</p>;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4">Профиль</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 rounded border"><h3 className="text-xs font-medium">Email</h3><p className="mt-1">{user.email}</p></div>
        <div className="p-4 rounded border"><h3 className="text-xs font-medium">Имя</h3><p className="mt-1">{user.full_name || '—'}</p></div>
        <div className="p-4 rounded border"><h3 className="text-xs font-medium">Логинов</h3><p className="mt-1">{user.login_count}</p></div>
      </div>
      <div className="mt-6">
        <button onClick={() => { localStorage.removeItem('access_token'); window.location.href = '/admin/login'; }} className="px-3 py-2 rounded border text-sm">Logout</button>
      </div>
    </div>
  );
}
