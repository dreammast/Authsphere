import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import styles from './AdminDashboardLayout.module.css';
import { useState } from 'react';

export default function AdminDashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin/dashboard', icon: '📊', label: 'Overview' },
    { path: '/admin/fees', icon: '💰', label: 'Fee Management' },
    { path: '/admin/students', icon: '🎓', label: 'Students' },
    { path: '/admin/users', icon: '👥', label: 'Users & Roles' },
    { path: '/admin/security', icon: '🛡️', label: 'Security & Policies' },
    { path: '/admin/messages', icon: '📢', label: 'Announcements' },
    { path: '/dashboard', icon: '🌐', label: 'Return to Portals' },
  ];

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🛡️</span>
            <span className={styles.logoText}>AdminPanel</span>
          </div>
          <button 
            className={styles.mobileClose}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.display_name?.charAt(0) || 'A'}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.display_name || 'Administrator'}</div>
              <div className={styles.userRole}>Super Admin</div>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <span className={styles.logoutIcon}>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <button 
            className={styles.mobileToggle}
            onClick={() => setIsMobileMenuOpen(true)}
          >
            ☰
          </button>
          
          <div className={styles.topbarLeft}>
             <h1 className={styles.pageTitle}>Vel Tech University Administration</h1>
          </div>

          <div className={styles.topbarRight}>
             <div className={styles.adminBadge}>
                Admin Mode Active
             </div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
