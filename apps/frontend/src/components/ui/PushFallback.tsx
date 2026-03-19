import { useState, useEffect } from 'react';

interface PushFallbackProps {
  email: string;
  onApprove: () => void;
  onCancel: () => void;
}

export function PushFallback({ email, onApprove, onCancel }: PushFallbackProps) {
  const [status, setStatus] = useState<'sending' | 'waiting' | 'approved'>('sending');

  useEffect(() => {
    const timer1 = setTimeout(() => setStatus('waiting'), 1500);
    const timer2 = setTimeout(() => setStatus('approved'), 5000);
    const timer3 = setTimeout(() => onApprove(), 6500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onApprove]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(3,5,10,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '40px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        textAlign: 'center',
        animation: 'fadeIn 0.35s ease',
      }}>
        {status === 'sending' && (
          <div className="fade-in">
            <div style={{
              position: 'relative', width: 80, height: 80,
              margin: '0 auto 20px',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%', background: 'rgba(0,212,255,0.15)',
                animation: 'pulseRing 1.5s ease-in-out infinite',
              }} />
              <div style={{
                position: 'relative', width: 64, height: 64,
                margin: '8px auto', borderRadius: '50%',
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
              }}>📱</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Sending Approval</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono'" }}>
              Initiating push request to your registered mobile device…
            </div>
          </div>
        )}

        {status === 'waiting' && (
          <div className="fade-in">
            <div style={{
              width: 80, height: 80, margin: '0 auto 20px',
              borderRadius: '50%', background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: 40, height: 40, border: '3px solid var(--border)',
                borderTopColor: 'var(--amber)', borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Waiting for Approval</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono'", marginBottom: 20 }}>
              Please tap <strong style={{ color: 'var(--text)' }}>'Approve'</strong> on the notification sent to your phone.
            </div>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 20px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: "'Syne', sans-serif",
              }}
            >
              ✕ Cancel Request
            </button>
          </div>
        )}

        {status === 'approved' && (
          <div className="fade-in">
            <div style={{
              width: 80, height: 80, margin: '0 auto 20px',
              borderRadius: '50%', background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', marginBottom: 8 }}>Access Granted</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono'" }}>
              Identity verified via mobile device. Redirecting to SSO portal…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
