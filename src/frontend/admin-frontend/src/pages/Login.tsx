import { FormEvent, useState } from 'react';
import { login } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/admin');
    } catch {
      setError('Неверные данные');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-2">Вход</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Авторизуйтесь для доступа к панели.</p>
      <form onSubmit={onSubmit} className="space-y-4 p-4 rounded border bg-white dark:bg-gray-900">
        <div>
          <label className="block text-xs uppercase tracking-wide mb-1">Email</label>
          <input name="email" type="email" required className="w-full px-3 py-2 rounded border bg-transparent" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide mb-1">Пароль</label>
          <input name="password" type="password" required className="w-full px-3 py-2 rounded border bg-transparent" />
        </div>
        <button disabled={loading} className="w-full py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60">{loading ? '...' : 'Войти'}</button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </section>
  );
}
