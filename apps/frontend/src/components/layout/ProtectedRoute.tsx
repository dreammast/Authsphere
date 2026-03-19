import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import styles from './ProtectedRoute.module.css';

export function ProtectedRoute() {
  const token = useAuthStore(state => state.token);
  const isLoading = useAuthStore(state => state.isLoading);
  const expiresAt = useAuthStore(state => state.expiresAt);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  const isExpired = expiresAt && Date.now() / 1000 > expiresAt;

  if (!token || isExpired) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
