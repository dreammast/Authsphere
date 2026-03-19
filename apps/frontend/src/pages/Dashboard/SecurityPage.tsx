import React from 'react';
import { useAuthStore } from '../../context/authStore';
import { JWTStatusStrip } from '../../components/ui/JWTStatusStrip';
import { AuditLogFeed } from '../../components/ui/AuditLogFeed';
import { Card, SectionHeader, ProgressBar } from '../../components/ui';
import { useJWTCountdown } from '../../hooks/useJWT';

export default function SecurityPage() {
  const { user, token, authMethod } = useAuthStore();
  const { str, pct, isExpiringSoon } = useJWTCountdown();

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>🎫 JWT Token & Security</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:24 }}>// Session state · RS256 claims · Active protections</div>

      <JWTStatusStrip />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <Card>
          <SectionHeader title="Token Claims" />
          <div style={{ fontFamily:'var(--font-mono)', fontSize:12, lineHeight:2.2 }}>
            <div><span style={{ color:'var(--muted)' }}>sub:  </span><span style={{ color:'var(--accent)' }}>{user?.email}</span></div>
            <div><span style={{ color:'var(--muted)' }}>role: </span><span style={{ color:'var(--green)' }}>{user?.role}</span></div>
            <div><span style={{ color:'var(--muted)' }}>iss:  </span><span style={{ color:'var(--text)' }}>authsphere.veltech.edu.in</span></div>
            <div><span style={{ color:'var(--muted)' }}>aud:  </span><span style={{ color:'var(--purple)' }}>["lms","erp","library","email"{user?.role==='admin'?',"admin"':''}]</span></div>
            <div><span style={{ color:'var(--muted)' }}>auth: </span><span style={{ color:'var(--accent)' }}>{authMethod}</span></div>
            {user?.student_id && <div><span style={{ color:'var(--muted)' }}>sid:  </span><span style={{ color:'var(--amber)' }}>{user.student_id}</span></div>}
            <div><span style={{ color:'var(--muted)' }}>exp:  </span><span style={{ color: isExpiringSoon ? 'var(--red)' : 'var(--amber)' }}>{str}</span></div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Threat Mitigation" />
          <div style={{ fontSize:13, lineHeight:2.4 }}>
            {[
              ['🛡️', 'Phishing',        'FIDO2 origin binding',    'green'],
              ['🔑', 'Password theft',  'No passwords exist',      'green'],
              ['🔄', 'Replay attacks',  'Nonce + TTL in Redis',    'green'],
              ['💳', 'Cred stuffing',   'Biometric-only auth',     'green'],
              ['🎭', 'Token hijacking', 'Short expiry + rotation', 'amber'],
            ].map(([icon, threat, mitigation, color]) => (
              <div key={threat} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span>{icon}</span>
                <span style={{ minWidth:120 }}>{threat}</span>
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:`var(--${color})` }}>{mitigation}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom:16 }}>
        <SectionHeader title="Session Health" />
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <ProgressBar value={pct} color={isExpiringSoon ? 'red' : 'green'} label="Session time remaining" showPct height={8} />
          <ProgressBar value={100} color="accent" label="Biometric confidence" showPct />
          <ProgressBar value={0}   color="red"   label="Failed attempts (0/5)" showPct />
        </div>
      </Card>

      {/* Full JWT token display */}
      {token && (
        <Card style={{ marginBottom:16 }}>
          <SectionHeader title="Raw JWT Token" tag="RS256" />
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--dim)',
            wordBreak:'break-all', lineHeight:1.8, background:'var(--surface)',
            border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
            {token.split('.').map((part, i) => (
              <span key={i} style={{ color: ['var(--green)','var(--accent)','var(--purple)'][i] }}>
                {part}{i < 2 ? '.' : ''}
              </span>
            ))}
          </div>
        </Card>
      )}

      <SectionHeader title="Your Audit Trail" />
      <AuditLogFeed limit={8} />
    </div>
  );
}
