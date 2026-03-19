import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { JWTStatusStrip } from '../../components/ui/JWTStatusStrip';
import { AuditLogFeed } from '../../components/ui/AuditLogFeed';
import { SectionHeader } from '../../components/ui';
import { useJWTCountdown, showToast } from '../../hooks/useJWT';

const PORTALS = [
  { key:'lms',     icon:'📚', name:'LMS',     sub:'Moodle / Canvas',     color:'var(--accent)',  path:'/portal/lms',    bg:'rgba(0,212,255,0.08)' },
  { key:'erp',     icon:'🏛️', name:'ERP',     sub:'SAP / Oracle',        color:'var(--purple)',  path:'/portal/erp',    bg:'rgba(124,58,237,0.08)' },
  { key:'library', icon:'🔬', name:'Library', sub:'Digital Repository',  color:'var(--green)',   path:'/portal/library',bg:'rgba(16,185,129,0.08)' },
  { key:'email',   icon:'✉️', name:'Email',   sub:'Campus Mail',         color:'var(--amber)',   path:'/portal/email',  bg:'rgba(245,158,11,0.08)' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();
  const { str, isExpiringSoon } = useJWTCountdown();

  const stats = [
    { val:'100%', label:'Phishing Prevention', trend:'↑ All attacks blocked', color:'var(--accent)' },
    { val:'0',    label:'Passwords Stored',    trend:'Zero-knowledge design', color:'var(--green)' },
    { val:str,    label:'Token Expires In',    trend:'↓ Counting down',       color: isExpiringSoon ? 'var(--red)' : 'var(--amber)' },
    { val:user?.role==='admin'?'6':'4', label:'Portals Unlocked', trend:'↑ Via SSO token', color:'var(--purple)' },
  ];

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>
        Welcome back, <span style={{ color:'var(--accent)' }}>{user?.student_id ?? user?.display_name}</span>
      </div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:28 }}>
        // Campus SSO active · All portals accessible
      </div>

      <JWTStatusStrip />

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14, marginBottom:28 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:14, padding:20, transition:'all 0.2s' }}>
            <div style={{ fontSize:34, fontWeight:800, letterSpacing:-1, lineHeight:1, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)', margin:'6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--green)' }}>{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Portal cards */}
      <SectionHeader title="Your Portals" tag="SSO READY" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:28 }}>
        {PORTALS.map((p) => (
          <div key={p.key} onClick={() => { navigate(p.path); showToast('success', `Launching ${p.name}`, 'JWT SSO token injected'); }}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16,
              padding:20, cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform='none'; (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${p.color},transparent)` }} />
            <span style={{ position:'absolute', top:12, right:12, fontSize:9, fontFamily:'var(--font-mono)',
              background:'rgba(16,185,129,0.1)', color:'var(--green)', border:'1px solid rgba(16,185,129,0.2)',
              padding:'2px 8px', borderRadius:5 }}>SSO READY</span>
            <div style={{ fontSize:28, marginBottom:10 }}>{p.icon}</div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:3 }}>{p.name}</div>
            <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>{p.sub}</div>
            <button style={{ width:'100%', padding:9, borderRadius:8, border:'none', cursor:'pointer',
              background:p.bg, color:p.color, fontSize:12, fontWeight:600, fontFamily:'var(--font-sans)',
              transition:'filter 0.2s' }}>
              Launch {p.name} →
            </button>
          </div>
        ))}
      </div>

      {/* Audit log */}
      <SectionHeader title="Recent Activity" />
      <AuditLogFeed limit={6} />
    </div>
  );
}
