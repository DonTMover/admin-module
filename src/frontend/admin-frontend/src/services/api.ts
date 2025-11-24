import axios from 'axios';

const api = axios.create({
  baseURL: '/', // same origin; adjust if backend served elsewhere
  withCredentials: true, // allow cookies from Caddy-origin backend
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

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<User>('/auth/me');
    return data;
  } catch {
    return null;
  }
}

export async function migrationsStatus() {
  const { data } = await api.get<{ status: string }>('/admin/migrations/status');
  return data;
}

export async function migrationsUpgradeHead() {
  const { data } = await api.post<{ status: string; message: string }>('/admin/migrations/upgrade');
  return data;
}

export interface DbTable {
  schema: string;
  name: string;
  full_name: string;
}

export interface DbTableRowsResponse {
  total: number;
  rows: Record<string, any>[];
}

export interface DbConnectionInfo {
  id: number;
  name: string;
  dsn: string;
  read_only: boolean;
  active: boolean;
}

export interface DbTableColumnMeta {
  name: string;
  data_type: string;
  is_nullable: boolean;
  has_default: boolean;
  default: any;
  is_primary_key: boolean;
  is_unique: boolean;
}

export interface DbTableMeta {
  schema: string;
  name: string;
  primary_key: string[];
  unique_indexes: { name: string; columns: string[] }[];
  columns: DbTableColumnMeta[];
}

export async function fetchDbTables(): Promise<DbTable[]> {
  const { data } = await api.get<DbTable[]>('/admin/db/tables');
  return data;
}

export async function fetchDbTableRows(
  schema: string,
  table: string,
  limit: number,
  offset: number,
): Promise<DbTableRowsResponse> {
  const { data } = await api.get<DbTableRowsResponse>(
    `/admin/db/table/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`,
    { params: { limit, offset } },
  );
  return data;
}

export async function fetchDbConnections(): Promise<DbConnectionInfo[]> {
  const { data } = await api.get<DbConnectionInfo[]>('/admin/db/connections');
  return data;
}

export async function testDbConnection(dsn: string): Promise<{ ok: boolean }> {
  const { data } = await api.post<{ ok: boolean }>('/admin/db/connections/test', { dsn });
  return data;
}

export async function createDbConnection(
  name: string,
  dsn: string,
  read_only: boolean,
): Promise<DbConnectionInfo> {
  const { data } = await api.post<DbConnectionInfo>('/admin/db/connections', { name, dsn, read_only });
  return data;
}

export async function activateDbConnection(connId: number): Promise<{ active: number }> {
  const { data } = await api.post<{ active: number }>(`/admin/db/connections/${connId}/activate`, {});
  return data;
}

export async function fetchDbTableMeta(schema: string, table: string): Promise<DbTableMeta> {
  const { data } = await api.get<DbTableMeta>(
    `/admin/db/table/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/meta`,
  );
  return data;
}

export async function insertDbRow(
  schema: string,
  table: string,
  values: Record<string, any>,
): Promise<{ row: Record<string, any> | null }> {
  const { data } = await api.post<{ row: Record<string, any> | null }>(
    `/admin/db/table/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/rows`,
    { values },
  );
  return data;
}

export async function updateDbRow(
  schema: string,
  table: string,
  key: Record<string, any>,
  values: Record<string, any>,
): Promise<{ row: Record<string, any> | null }> {
  const { data } = await api.put<{ row: Record<string, any> | null }>(
    `/admin/db/table/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/rows`,
    { key, values },
  );
  return data;
}

export async function deleteDbRow(
  schema: string,
  table: string,
  key: Record<string, any>,
): Promise<{ deleted: number }> {
  const { data } = await api.delete<{ deleted: number }>(
    `/admin/db/table/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/rows`,
    { data: { key } },
  );
  return data;
}

export default api;
