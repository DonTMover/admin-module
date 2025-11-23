export default function NotAuthenticated() {
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-semibold">Не авторизован</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Для доступа к панели войдите в систему. Если аккаунта ещё нет — зарегистрируйтесь.</p>
      <div className="mt-6 flex gap-3 justify-center flex-wrap">
        <a href="/admin/login" className="px-4 py-2 rounded bg-blue-600 text-white text-sm">Войти</a>
        <a href="/auth/register" className="px-4 py-2 rounded border text-sm">Регистрация</a>
      </div>
      <div className="mt-10 text-xs text-gray-500">Ошибка 401 • Доступ запрещён</div>
    </div>
  );
}
