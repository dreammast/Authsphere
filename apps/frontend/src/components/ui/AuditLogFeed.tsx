import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { LiveBadge } from '../ui';

interface AuditEvent {
  id: string;
  event_type: string;
  outcome: 'success' | 'failure' | 'warning';
  timestamp: string;
  auth_method?: string;
  user?: { email: string; display_name: string };
}

const outcomeColor = { success:'var(--green)', failure:'var(--red)', warning:'var(--amber)' };

export const AuditLogFeed: React.FC<{ limit?: number, hideHeader?: boolean }> = ({ limit = 10, hideHeader = false }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/audit/events')
      .then((r) => setEvents(r.data.data?.slice(0, limit) ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [limit]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  };

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
      {!hideHeader && (
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, fontWeight:700 }}>Auth Event Feed</span>
          <LiveBadge />
        </div>
      )}

      {loading ? (
        <div style={{ padding:20, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ padding:20, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No events yet</div>
      ) : (
        events.map((ev) => (
          <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12,
            padding:'10px 20px', borderBottom:'1px solid rgba(23,32,56,0.5)',
            fontSize:12, transition:'background 0.15s' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
              background: outcomeColor[(ev as any).outcome as keyof typeof outcomeColor] ?? 'var(--dim)',
              boxShadow: `0 0 5px ${outcomeColor[(ev as any).outcome as keyof typeof outcomeColor] ?? 'transparent'}` }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', width:90, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis' }}>
              {ev.user?.email?.split('@')[0] ?? 'system'}
            </span>
            <span style={{ flex:1, color:'var(--text)' }}>
              {String((ev as any).event_type ?? (ev as any).action ?? 'EVENT').replace(/_/g, ' ')}
            </span>
            {ev.auth_method && (
              <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--purple)',
                background:'rgba(124,58,237,0.08)', padding:'1px 6px', borderRadius:4 }}>
                {ev.auth_method}
              </span>
            )}
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--dim)', flexShrink:0 }}>
              {formatTime(String((ev as any).timestamp ?? (ev as any).createdAt ?? new Date().toISOString()))}
            </span>
          </div>
        ))
      )}
    </div>
  );
};
