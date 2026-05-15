import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, accessToken } = useAuthStore();
  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/fonts" replace />;
  return <Outlet />;
}
