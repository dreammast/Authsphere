import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';

export default function AdminRoute() {
  const { token, user, expiresAt } = useAuthStore();
  const isExpired = expiresAt && Date.now() / 1000 > expiresAt;

  if (!token || isExpired) {
    return <Navigate to="/login" replace />;
  }

  // Prevent students or faculty from accessing admin routes
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
