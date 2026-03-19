import React from 'react';
import { useAuthStore } from '../../context/authStore';
import { useJWTCountdown } from '../../hooks/useJWT';
import { ProgressBar } from '../ui';

export const JWTStatusStrip: React.FC = () => {
  const { user, token, authMethod } = useAuthStore();
  const { str, pct, isExpiringSoon } = useJWTCountdown();

  const expColor = isExpiringSoon ? 'var(--red)' : 'var(--amber)';

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)',
      borderRadius:14, padding:'16px 20px', marginBottom:24 }}>

      {/* Token row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12,
        paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:2, color:'var(--muted)', flexShrink:0 }}>JWT TOKEN</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--dim)',
          flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {token ?? '—'}
        </span>
        <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--green)',
          background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)',
          padding:'2px 10px', borderRadius:6, flexShrink:0 }}>
          ✓ VALID
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom:12 }}>
        <ProgressBar value={pct} color={isExpiringSoon ? 'red' : 'green'} height={4} />
      </div>

      {/* Meta cells */}
      <div style={{ display:'flex', gap:10 }}>
        {[
          { label:'EXPIRES IN',   value:str,                        color:expColor },
          { label:'ALGORITHM',    value:'RS256',                    color:'var(--purple)' },
          { label:'AUTH METHOD',  value:authMethod ?? '—',          color:'var(--accent)', small:true },
          { label:'PORTALS',      value: user?.role === 'admin' ? '6' : '4', color:'var(--green)' },
        ].map((cell) => (
          <div key={cell.label} style={{ flex:1, background:'var(--surface)',
            border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:1, color:'var(--muted)' }}>
              {cell.label}
            </div>
            <div style={{ fontSize: cell.small ? 11 : 18, fontWeight:800,
              fontFamily:'var(--font-mono)', marginTop:3, color:cell.color }}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
