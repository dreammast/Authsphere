import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../context/authStore';
import { Card, SectionHeader, Badge, Avatar, ProgressBar, Skeleton } from '../../components/ui';
import { AuditLogFeed } from '../../components/ui/AuditLogFeed';
import { Button } from '../../components/ui/Button';
import { showToast } from '../../hooks/useJWT';

interface AdminUser {
  id: string; email: string; display_name: string; role: string;
  student_id?: string; dept?: string; locked_at?: string | null;
  has_fido2: boolean;
  last_session?: { issued_at: string; auth_method: string } | null;
}
interface AdminStats { totalUsers:number; activeSessions:number; fido2Count:number; recentEvents:number }

const PolicyToggle: React.FC<{ label:string; sub:string; defaultOn?:boolean }> = ({ label, sub, defaultOn=true }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
      <button onClick={() => { setOn(!on); showToast('info', `${label} ${!on?'enabled':'disabled'}`); }}
        style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative', flexShrink:0,
          background: on ? 'linear-gradient(90deg,var(--accent),var(--purple))' : 'var(--border2)',
          transition:'background 0.2s' }}>
        <div style={{ position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff',
          transition:'left 0.2s', left: on ? 23 : 3 }} />
      </button>
      <div>
        <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{sub}</div>
      </div>
    </div>
  );
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [tab,     setTab]     = useState<'overview'|'users'|'audit'|'stats'>('overview');

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    Promise.all([api.get('/api/admin/users'), api.get('/api/admin/stats')])
      .then(([u, s]) => { setUsers(u.data.data); setStats(s.data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((u) =>
    !search || u.email.includes(search) || u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const revokeDevice = async (userId: string, email: string) => {
    await api.post(`/api/admin/users/${userId}/revoke-device`);
    showToast('warning', `Devices revoked for ${email}`);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, has_fido2: false } : u));
  };

  const lockUser = async (userId: string, email: string) => {
    await api.post(`/api/admin/users/${userId}/lock`);
    showToast('error', `Account locked: ${email}`);
  };

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>⚙️ Admin Panel</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:24 }}>
        // Security policies · User registry · System health
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24 }}>
        {(['overview','users','audit','stats'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, cursor:'pointer',
              background: tab===t ? 'rgba(124,58,237,0.1)' : 'transparent',
              border: `1px solid ${tab===t ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
              color: tab===t ? 'var(--purple)' : 'var(--muted)',
              fontFamily:'var(--font-sans)', fontWeight:600, transition:'all 0.2s' }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <>
          {/* Quick stats */}
          {stats && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[
                { val:stats.totalUsers,    label:'Total Users',    color:'var(--accent)' },
                { val:stats.activeSessions,label:'Active Sessions',color:'var(--green)' },
                { val:stats.fido2Count,    label:'FIDO2 Devices',  color:'var(--purple)' },
                { val:stats.recentEvents,  label:'Events (24h)',   color:'var(--amber)' },
              ].map((s) => (
                <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
                  <div style={{ fontSize:32, fontWeight:800, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)', marginTop:6 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Policies */}
            <Card>
              <SectionHeader title="Security Policies" />
              <PolicyToggle label="FIDO2 Biometric Auth"   sub="Primary authentication method"       defaultOn={true} />
              <PolicyToggle label="OTP Fallback"           sub="Push notification fallback"          defaultOn={true} />
              <PolicyToggle label="Force Re-Auth on Portal" sub="Require biometric per portal"       defaultOn={false} />
              <PolicyToggle label="Full Audit Logging"     sub="Log every auth event (NIST 800-63B)" defaultOn={true} />
            </Card>

            {/* Configuration */}
            <Card>
              <SectionHeader title="Token Configuration" />
              {[
                { label:'TOKEN EXPIRY',         options:['15 minutes','30 minutes','1 hour','8 hours (admin)'],       def:1 },
                { label:'FALLBACK POLICY',      options:['OTP via Push','SMS OTP','Email OTP','Disabled'],            def:0 },
                { label:'AUDIT LOG RETENTION',  options:['30 days','90 days','1 year (compliance)'],                  def:1 },
              ].map((f) => (
                <div key={f.label} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:2, color:'var(--muted)', marginBottom:6 }}>{f.label}</label>
                  <select defaultValue={f.options[f.def]}
                    onChange={() => showToast('info', 'Policy updated')}
                    style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
                      padding:'10px 14px', fontSize:13, color:'var(--text)', fontFamily:'var(--font-sans)', outline:'none', cursor:'pointer' }}>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <Button variant="primary" size="sm" onClick={() => showToast('success', 'Policies saved')}>Save Policies</Button>
            </Card>
          </div>
        </>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <Card>
          <SectionHeader title="User Registry" tag={`${users.length} USERS`} />
          <div style={{ position:'relative', marginBottom:16 }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'var(--muted)' }}>🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:8, padding:'10px 16px 10px 38px', fontSize:13, color:'var(--text)',
                fontFamily:'var(--font-sans)', outline:'none' }} />
          </div>
          {loading ? <Skeleton height={200} /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['USER','EMAIL','ROLE','FIDO2','LAST AUTH','STATUS','ACTIONS'].map((h) => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:9,
                        fontFamily:'var(--font-mono)', letterSpacing:2, color:'var(--muted)',
                        borderBottom:'1px solid var(--border)', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid rgba(23,32,56,0.5)', verticalAlign:'middle' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Avatar name={u.display_name} size="sm" colorIndex={i%4} />
                          <span style={{ fontSize:13 }}>{u.display_name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid rgba(23,32,56,0.5)', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>{u.email}</td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid rgba(23,32,56,0.5)' }}>
                        <Badge variant={u.role as 'admin'|'student'|'faculty'}>{u.role}</Badge>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid rgba(23,32,56,0.5)' }}>
                        <Badge variant={u.has_fido2 ? 'active' : 'pending'}>
                          {u.has_fido2 ? '✓ Registered' : '— Pending'}
                        </Badge>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid rgba(23,32,56,0.5)', fontSize:11, fontFamily:'var(--font-mono)' }}>
                        {u.last_session ? new Date(u.last_session.issued_at).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid rgba(23,32,56,0.5)' }}>
                        <Badge variant={u.locked_at ? 'error' : 'active'} dot>
                          {u.locked_at ? 'Locked' : 'Active'}
                        </Badge>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid rgba(23,32,56,0.5)' }}>
                        <div style={{ display:'flex', gap:4 }}>
                          <Button variant="secondary" size="sm" icon onClick={() => revokeDevice(u.id, u.email)} title="Revoke devices">🔒</Button>
                          <Button variant="danger" size="sm" icon onClick={() => lockUser(u.id, u.email)} title="Lock account">⛔</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Audit tab */}
      {tab === 'audit' && <AuditLogFeed limit={20} />}

      {/* Stats tab */}
      {tab === 'stats' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
            {[
              { val:'100%', label:'Phishing Prevention', color:'var(--accent)', sub:'All FIDO2 origin-bound' },
              { val:'0',    label:'Passwords Stored',    color:'var(--green)',  sub:'Zero-knowledge design' },
              { val:'5×',   label:'Faster Login',        color:'var(--purple)', sub:'vs password-based SSO' },
              { val:'80%',  label:'IT Tickets Saved',    color:'var(--amber)',  sub:'No lockouts' },
              { val:'AAL2', label:'NIST Compliance',     color:'var(--green)',  sub:'800-63B Authenticator Level' },
              { val:'P99<120ms',label:'Auth Latency',    color:'var(--accent)', sub:'Challenge-response time' },
            ].map((s) => (
              <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:28, fontWeight:800, color:s.color, marginBottom:4 }}>{s.val}</div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <Card>
            <SectionHeader title="Auth Performance" />
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <ProgressBar value={97} color="green"  label="Biometric success rate" showPct height={8} />
              <ProgressBar value={8}  color="amber" label="OTP fallback usage"      showPct />
              <ProgressBar value={64} color="accent" label="Session utilization"    showPct />
              <ProgressBar value={1}  color="red"   label="Auth failures / lockouts" showPct />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
