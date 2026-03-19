import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { Avatar } from '../ui';
import { Button } from '../ui/Button';
import { showToast } from '../../hooks/useJWT';

const NAV_LINKS = [
  { label: 'Overview',  path: '/dashboard' },
  { label: 'Portals',   path: '/portals' },
  { label: 'Security',  path: '/security' },
  { label: 'Admin',     path: '/admin',  adminOnly: true },
];

export const TopNavbar: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    showToast('info', 'Signed out', 'Session revoked. JWT blacklisted.');
    navigate('/');
  };

  return (
    <nav style={{ position:'sticky', top:0, zIndex:100,
      background:'rgba(3,5,10,0.92)', backdropFilter:'blur(12px)',
      borderBottom:'1px solid var(--border)',
      height:60, padding:'0 28px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      flexShrink:0 }}>

      {/* Logo */}
      <span style={{ fontSize:18, fontWeight:800,
        background:'linear-gradient(135deg,var(--accent),var(--purple))',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', cursor:'pointer' }}
        onClick={() => navigate('/dashboard')}>
        AuthSphere
      </span>

      {/* Nav links */}
      <div style={{ display:'flex', gap:4 }}>
        {NAV_LINKS.filter((l) => !l.adminOnly || user?.role === 'admin').map((l) => (
          <button key={l.path}
            onClick={() => navigate(l.path)}
            style={{ padding:'6px 14px', borderRadius:8, fontSize:13, cursor:'pointer',
              background: location.pathname === l.path ? 'rgba(0,212,255,0.08)' : 'transparent',
              border: location.pathname === l.path ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
              color: location.pathname === l.path ? 'var(--accent)' : 'var(--muted)',
              transition:'all 0.2s', fontFamily:'var(--font-sans)' }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ display:'flex', alignItems:'center', gap:6,
          fontSize:10, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)',
            boxShadow:'0 0 6px var(--green)', animation:'pulse 2s infinite' }} />
          ONLINE
        </span>

        {user && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar name={user.display_name} size="sm" />
            <div>
              <div style={{ fontSize:12, fontWeight:600, lineHeight:1.2 }}>{user.display_name}</div>
              <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{user.role}</div>
            </div>
          </div>
        )}

        <Button variant="danger" size="sm" onClick={handleLogout}>Logout</Button>
      </div>
    </nav>
  );
};
