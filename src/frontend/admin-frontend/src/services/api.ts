import axios from 'axios';

const api = axios.create({
  baseURL: '/', // same origin; adjust if backend served elsewhere
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  login_count?: number;
  created_at?: string;
  last_login?: string | null;
}

export async function login(email: string, password: string) {
  const form = new FormData();
  form.append('username', email);
  form.append('password', password);
  const { data } = await api.post<{ access_token: string; token_type: string }>('/auth/token', form);
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function fetchUsers() {
  const { data } = await api.get<User[]>('/admin/users/');
  return data;
}

// Derive current user by matching email from token if JWT with email subject; placeholder implementation
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const users = await fetchUsers();
    // If token encodes email, decode (assumes JWT). This is naive; adjust to backend specifics.
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1] || 'e30='));
    const email = payload.sub || payload.email;
    return users.find(u => u.email === email) || null;
  } catch {
    return null;
  }
}

export default api;
