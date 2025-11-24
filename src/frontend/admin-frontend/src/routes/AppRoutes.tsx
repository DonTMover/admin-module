import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../ui/Layout';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import NotAuthenticated from '../pages/NotAuthenticated';
import MigrationsPage from '../pages/Migrations';
import DbBrowser from '../pages/DbBrowser';

// Simple auth guard reading token from localStorage
const isAuthed = () => Boolean(localStorage.getItem('access_token'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route element={<Layout />}>        
        <Route path="/admin" element={isAuthed() ? <Dashboard /> : <NotAuthenticated />} />
        <Route path="/admin/profile" element={isAuthed() ? <Profile /> : <NotAuthenticated />} />
        <Route path="/admin/migrations" element={isAuthed() ? <MigrationsPage /> : <NotAuthenticated />} />
        <Route path="/admin/db" element={isAuthed() ? <DbBrowser /> : <NotAuthenticated />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="*" element={<NotAuthenticated />} />
      </Route>
    </Routes>
  );
}
