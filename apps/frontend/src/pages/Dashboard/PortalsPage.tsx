import React from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../hooks/useJWT';
import { useAuthStore } from '../../context/authStore';

const PORTALS = [
  { key:'lms',     icon:'📚', name:'Learning Management', sub:'Moodle / Canvas', desc:'Courses, grades, assignments, attendance tracking', color:'var(--accent)',  bg:'rgba(0,212,255,0.06)', path:'/portal/lms' },
  { key:'erp',     icon:'🏛️', name:'Enterprise Resource', sub:'SAP / Oracle',    desc:'Fee records, hostel allotment, transport pass, HR', color:'var(--purple)', bg:'rgba(124,58,237,0.06)', path:'/portal/erp' },
  { key:'library', icon:'🔬', name:'Digital Library',     sub:'Digital Repo',    desc:'Books, journals, research papers, eBooks, reservations', color:'var(--green)',  bg:'rgba(16,185,129,0.06)', path:'/portal/library' },
  { key:'email',   icon:'✉️', name:'Campus Email',        sub:'Gmail / Outlook', desc:'Internal messaging, notifications, announcements', color:'var(--amber)',  bg:'rgba(245,158,11,0.06)', path:'/portal/email' },
];

export default function PortalsPage() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>🌐 Campus Portals</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:28 }}>
        // JWT SSO active · Click any portal to launch with your token
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, marginBottom:20 }}>
        {PORTALS.map((p) => (
          <div key={p.key}
            onClick={() => { navigate(p.path); showToast('success', `Launching ${p.name}`, 'JWT SSO token injected'); }}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16,
              padding:24, cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform='none'; (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${p.color},transparent)` }} />
            <span style={{ position:'absolute', top:12, right:12, fontSize:9, fontFamily:'var(--font-mono)',
              background:'rgba(16,185,129,0.1)', color:'var(--green)', border:'1px solid rgba(16,185,129,0.2)',
              padding:'2px 8px', borderRadius:5 }}>SSO READY</span>
            <div style={{ fontSize:30, marginBottom:10 }}>{p.icon}</div>
            <div style={{ fontSize:17, fontWeight:700, marginBottom:2 }}>{p.name}</div>
            <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)', marginBottom:8 }}>{p.sub}</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16, lineHeight:1.6 }}>{p.desc}</div>
            <button style={{ width:'100%', padding:10, borderRadius:8, border:'none', cursor:'pointer',
              background:p.bg, color:p.color, fontSize:13, fontWeight:600, fontFamily:'var(--font-sans)' }}>
              Launch {p.name.split(' ')[0]} →
            </button>
          </div>
        ))}

        {user?.role === 'admin' && (
          <div onClick={() => navigate('/admin')}
            style={{ background:'var(--card)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:16, padding:24, cursor:'pointer', transition:'all 0.2s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform='none'; }}>
            <div style={{ fontSize:30, marginBottom:10 }}>⚙️</div>
            <div style={{ fontSize:17, fontWeight:700, marginBottom:2 }}>Admin Panel</div>
            <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--purple)', marginBottom:16 }}>Policies · Users · Analytics</div>
            <button style={{ width:'100%', padding:10, borderRadius:8, border:'none', cursor:'pointer',
              background:'rgba(124,58,237,0.08)', color:'var(--purple)', fontSize:13, fontWeight:600, fontFamily:'var(--font-sans)' }}>
              Open Admin →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
