import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';

const ITEMS = [
  { section: 'DASHBOARD', links: [
    { icon:'🏠', label:'Overview',  path:'/dashboard' },
    { icon:'🌐', label:'Portals',   path:'/portals',  badge:'6' },
    { icon:'🎫', label:'JWT Token', path:'/security' },
    { icon:'📋', label:'Audit Log', path:'/audit',   badge:'live', badgeColor:'var(--green)' },
  ]},
  { section: 'PORTALS', links: [
    { icon:'📚', label:'LMS',     path:'/portal/lms' },
    { icon:'🏛️', label:'ERP',     path:'/portal/erp' },
    { icon:'🔬', label:'Library', path:'/portal/library' },
    { icon:'✉️', label:'Email',   path:'/portal/email' },
  ]},
  { section: 'ADMIN', links: [
    { icon: '🛡️', label: 'Admin Dashboard', path: '/admin/dashboard', adminOnly: true },
    { icon:'⚙️', label:'Policies',  path:'/admin',        adminOnly:true },
    { icon:'👥', label:'Users',     path:'/admin/users',  adminOnly:true },
    { icon:'📊', label:'Analytics', path:'/admin/stats',  adminOnly:true },
  ]},
];

export const Sidebar: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuthStore();

  return (
    <aside style={{ width:240, flexShrink:0, background:'var(--surface)',
      borderRight:'1px solid var(--border)', overflowY:'auto',
      padding:'16px 0', display:'flex', flexDirection:'column' }}>

      {ITEMS.map((section) => {
        const filtered = section.links.filter((l) => !(l as { adminOnly?: boolean }).adminOnly || user?.role === 'admin');
        if (!filtered.length) return null;
        return (
          <div key={section.section} style={{ marginBottom:8 }}>
            <div style={{ padding:'12px 16px 4px', fontSize:9,
              fontFamily:'var(--font-mono)', letterSpacing:3,
              color:'var(--dim)', textTransform:'uppercase' }}>
              {section.section}
            </div>
            {filtered.map((link) => {
              const active = location.pathname === link.path;
              return (
                <div key={link.path}
                  onClick={() => navigate(link.path)}
                  style={{ display:'flex', alignItems:'center', gap:10,
                    padding:'8px 16px', cursor:'pointer', transition:'all 0.15s',
                    fontSize:13, color: active ? 'var(--accent)' : 'var(--muted)',
                    background: active ? 'rgba(0,212,255,0.06)' : 'transparent',
                    borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}` }}>
                  <span style={{ fontSize:15, width:20, textAlign:'center' }}>{link.icon}</span>
                  <span>{link.label}</span>
                  {(link as { badge?: string }).badge && (
                    <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'var(--font-mono)',
                      background: (link as { badgeColor?: string }).badgeColor ? 'rgba(16,185,129,0.1)' : 'var(--card2)',
                      color: (link as { badgeColor?: string }).badgeColor ?? 'var(--dim)',
                      padding:'2px 7px', borderRadius:4 }}>
                      {(link as { badge?: string }).badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Auth info footer */}
      <div style={{ marginTop:'auto', padding:'16px', borderTop:'1px solid var(--border)' }}>
        <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--dim)', marginBottom:6 }}>SESSION</div>
        <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)', lineHeight:2 }}>
          <div>Role: <span style={{ color:'var(--green)' }}>{user?.role}</span></div>
          {user?.student_id && <div>ID: <span style={{ color:'var(--accent)' }}>{user.student_id}</span></div>}
          {user?.dept && <div style={{ color:'var(--dim)', fontSize:10 }}>{user.dept.substring(0,22)}…</div>}
        </div>
      </div>
    </aside>
  );
};
