import type { FormEvent } from 'react';
import { useState } from 'react';

export default function Register() {
  const [error, setError] = useState<string | null>(null);
  // allow logic could be fetched from backend later; for now always true

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const full_name = (form.elements.namedItem('full_name') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const fd = new FormData();
    fd.append('email', email);
    fd.append('full_name', full_name);
    fd.append('password', password);
    try {
      const res = await fetch('/auth/register', { method: 'POST', body: fd });
      if (!res.ok) {
        setError('Email уже существует');
        return;
      }
      // backend redirects to /admin/login
      window.location.href = '/admin/login';
    } catch {
      setError('Ошибка подключения');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl overflow-hidden border bg-white dark:bg-gray-900">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-500">
            <h2 className="text-xl font-semibold text-white tracking-wide">Регистрация администратора</h2>
            <p className="text-white/80 text-sm mt-1">Создайте первую учетную запись для входа</p>
          </div>
          <div className="px-6 py-6 space-y-5">
            {error && (
              <div className="p-3 rounded-md bg-red-100 text-red-700 text-sm">{error}</div>
            )}
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1">Email</label>
                <input name="email" type="email" required className="w-full px-3 py-2 rounded-md border focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1">Имя</label>
                <input name="full_name" type="text" className="w-full px-3 py-2 rounded-md border focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1">Пароль</label>
                <input name="password" type="password" required minLength={6} className="w-full px-3 py-2 rounded-md border focus:outline-none" />
              </div>
              <button className="w-full h-11 text-sm tracking-wide rounded bg-blue-600 text-white">Создать пользователя</button>
            </form>
            <p className="text-xs text-gray-600 dark:text-gray-400">Уже есть аккаунт? <a href="/admin/login" className="text-blue-600 hover:underline">Войти</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
