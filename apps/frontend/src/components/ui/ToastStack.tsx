import React from 'react';
import { useToasts, ToastType } from '../../hooks/useJWT';

const toastConfig: Record<ToastType, { icon: string; border: string }> = {
  success: { icon:'✅', border:'var(--green)' },
  error:   { icon:'🔴', border:'var(--red)' },
  warning: { icon:'⚠️', border:'var(--amber)' },
  info:    { icon:'ℹ️', border:'var(--accent)' },
};

const titles: Record<ToastType, string> = {
  success: 'Success', error: 'Error', warning: 'Warning', info: 'Info',
};

export const ToastStack: React.FC = () => {
  const { toasts, remove } = useToasts();
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:2000,
      display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map((t) => (
        <div key={t.id} onClick={() => remove(t.id)}
          style={{ background:'var(--card2)', border:`1px solid var(--border2)`,
            borderLeft:`3px solid ${toastConfig[t.type].border}`,
            borderRadius:12, padding:'14px 16px', maxWidth:320,
            display:'flex', alignItems:'flex-start', gap:10,
            pointerEvents:'all', cursor:'pointer',
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            animation:'toastIn 0.3s ease' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{toastConfig[t.type].icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{titles[t.type]}</div>
            <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{t.title}</div>
            {t.msg && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};
