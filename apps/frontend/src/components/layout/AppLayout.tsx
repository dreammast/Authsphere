import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './AppLayout.module.css';

interface NavItem { label: string; path: string; icon: string; badge?: string; adminOnly?: boolean; }

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'LMS', path: '/lms', icon: '📚', badge: 'SSO' },
  { label: 'ERP', path: '/erp', icon: '🏛️', badge: 'SSO' },
  { label: 'Library', path: '/library', icon: '🔬', badge: 'SSO' },
  { label: 'Email', path: '/email', icon: '✉️', badge: 'SSO' },
  { label: 'Admin', path: '/admin', icon: '⚙️', adminOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, authMethod } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out. JWT revoked.');
    navigate('/');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className={styles.layout}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className={styles.navLogo}>AuthSphere</div>
        </div>
        <div className={styles.navRight}>
          <div className={styles.onlineDot}><div className={styles.onlineDotCircle}></div>ONLINE</div>
          <div className={styles.userChip}>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono'" }}>{user?.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className={styles.body}>
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside className={styles.sidebar}>
            <div className={styles.sbSection}>
              <div className={styles.sbSectionLabel}>PORTALS</div>
              {navItems.filter(n => !n.adminOnly || user?.role === 'ADMIN').map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.sbItem} ${location.pathname === item.path ? styles.sbItemActive : ''}`}
                >
                  <span className={styles.sbIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className={styles.sbBadge}>{item.badge}</span>}
                </Link>
              ))}
            </div>
            <div className={styles.sbSection}>
              <div className={styles.sbSectionLabel}>SESSION</div>
              <div style={{ padding: '8px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>
                <div style={{ color: 'var(--muted)', marginBottom: 4 }}>METHOD</div>
                <div style={{ color: 'var(--accent)' }}>{authMethod?.replace('_', '/') || 'Unknown'}</div>
                <div style={{ color: 'var(--muted)', marginBottom: 4, marginTop: 10 }}>ROLE</div>
                <div style={{ color: 'var(--green)' }}>{user?.role}</div>
                {user?.studentId && <>
                  <div style={{ color: 'var(--muted)', marginBottom: 4, marginTop: 10 }}>ID</div>
                  <div style={{ color: 'var(--purple)' }}>{user.studentId}</div>
                </>}
              </div>
            </div>
          </aside>
        )}

        {/* MAIN */}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
