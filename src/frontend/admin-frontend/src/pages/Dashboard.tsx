import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../services/api';

export default function Dashboard() {
  const { data: users, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  return (
    <section className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-2">
        <h2 className="text-xl font-semibold">Пользователи</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Список зарегистрированных пользователей приложения.</p>
        <div className="p-4 rounded border bg-white dark:bg-gray-900">
          <strong>Всего пользователей:</strong> {users?.length ?? 0}
        </div>
      </div>
      <div className="md:col-span-2">
        {isLoading && <p className="text-sm">Загрузка...</p>}
        {error && <p className="text-sm text-red-600">Ошибка загрузки</p>}
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Имя</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map(u => (
                <tr key={u.id} className="odd:bg-gray-50 dark:odd:bg-gray-800">
                  <td className="p-2 border">{u.id}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.full_name || ''}</td>
                </tr>
              ))}
              {!isLoading && users?.length === 0 && (
                <tr><td colSpan={3} className="p-2 text-center text-gray-500">Нет пользователей.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
