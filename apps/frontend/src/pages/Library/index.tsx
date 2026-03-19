import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { SectionHeader, Card, Badge, Skeleton } from '../../components/ui';
import { JWTStatusStrip } from '../../components/ui/JWTStatusStrip';

// ── LIBRARY PAGE ──────────────────────────────────────────
interface IssuedBook { id:string; title:string; author:string; issued_at:string; due_date:string; returned_at:string|null; fine_amount:number|null }
interface Book { id:string; title:string; author:string; category:string; copies_available:number; copies_total:number }

export function LibraryPage() {
  const [issued,    setIssued]    = useState<IssuedBook[]>([]);
  const [catalogue, setCatalogue] = useState<Book[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<'issued'|'catalogue'>('issued');

  useEffect(() => {
    api.get('/api/library/dashboard').then((r) => {
      setIssued(r.data.data.issued);
      setCatalogue(r.data.data.catalogue);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const now = new Date();

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>🔬 Digital Library</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:24 }}>// Books, journals, digital resources</div>
      <JWTStatusStrip />

      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {(['issued','catalogue'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, cursor:'pointer',
              background: tab===t ? 'rgba(16,185,129,0.08)' : 'transparent',
              border: `1px solid ${tab===t ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
              color: tab===t ? 'var(--green)' : 'var(--muted)',
              fontFamily:'var(--font-sans)', fontWeight:600, transition:'all 0.2s' }}>
            {t === 'issued' ? `📚 Issued (${issued.length})` : '🔍 Catalogue'}
          </button>
        ))}
      </div>

      {loading && <Skeleton height={200} />}

      {!loading && tab === 'issued' && (
        <Card>
          <SectionHeader title="Issued Books" />
          {issued.length === 0 ? (
            <div style={{ color:'var(--muted)', fontSize:13 }}>No books currently issued</div>
          ) : issued.map((b) => {
            const overdue = !b.returned_at && new Date(b.due_date) < now;
            return (
              <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:24 }}>📖</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{b.title}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>by {b.author}</div>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                    Issued: {new Date(b.issued_at).toLocaleDateString()} · Due: {new Date(b.due_date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  {b.returned_at ? <Badge variant="active">Returned</Badge> :
                    overdue ? <Badge variant="error" dot>OVERDUE {b.fine_amount ? `• ₹${b.fine_amount}` : ''}</Badge> :
                    <Badge variant="pending" dot>Active</Badge>}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {!loading && tab === 'catalogue' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
          {catalogue.map((b) => (
            <Card key={b.id}>
              <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--muted)', marginBottom:4 }}>{b.category}</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{b.title}</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>by {b.author}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                  {b.copies_available}/{b.copies_total} available
                </span>
                <Badge variant={b.copies_available > 0 ? 'active' : 'error'}>
                  {b.copies_available > 0 ? 'Available' : 'All Issued'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EMAIL PAGE ────────────────────────────────────────────
interface Message { id:string; subject:string; body:string; sent_at:string; read_at:string|null; sender_name:string }

export function EmailPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message|null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/api/email/inbox').then((r) => setMessages(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const openMessage = async (msg: Message) => {
    setSelected(msg);
    if (!msg.read_at) {
      await api.patch(`/api/email/inbox/${msg.id}/read`);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m));
    }
  };

  const unread = messages.filter((m) => !m.read_at).length;

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>✉️ Campus Email</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:24 }}>
        // Gmail / Outlook · {unread} unread
      </div>
      <JWTStatusStrip />

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:16, minHeight:400 }}>
        {/* Inbox list */}
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, fontWeight:700 }}>Inbox</span>
            {unread > 0 && <Badge variant="info">{unread} unread</Badge>}
          </div>
          {loading ? <div style={{ padding:20 }}><Skeleton height={60} /></div> :
            messages.map((m) => (
              <div key={m.id} onClick={() => openMessage(m)}
                style={{ padding:'12px 16px', borderBottom:'1px solid rgba(23,32,56,0.5)',
                  cursor:'pointer', transition:'background 0.15s',
                  background: selected?.id===m.id ? 'rgba(0,212,255,0.05)' : 'transparent',
                  borderLeft: selected?.id===m.id ? '2px solid var(--accent)' : '2px solid transparent' }}
                onMouseEnter={(e) => { if (selected?.id!==m.id)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'; }}
                onMouseLeave={(e) => { if (selected?.id!==m.id)(e.currentTarget as HTMLElement).style.background='transparent'; }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight: m.read_at ? 400 : 700, flex:1,
                    color: m.read_at ? 'var(--text)' : 'var(--white)' }}>
                    {m.subject}
                  </span>
                  {!m.read_at && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>From: {m.sender_name}</div>
                <div style={{ fontSize:10, color:'var(--dim)', fontFamily:'var(--font-mono)' }}>
                  {new Date(m.sent_at).toLocaleDateString()}
                </div>
              </div>
            ))
          }
        </Card>

        {/* Message view */}
        <Card>
          {selected ? (
            <>
              <div style={{ marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{selected.subject}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  From: <span style={{ color:'var(--accent)' }}>{selected.sender_name}</span> ·{' '}
                  {new Date(selected.sent_at).toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize:14, lineHeight:1.8, color:'var(--text)', whiteSpace:'pre-wrap' }}>
                {selected.body}
              </div>
            </>
          ) : (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--muted)', fontSize:13, textAlign:'center' }}>
              <div>
                <div style={{ fontSize:32, marginBottom:8 }}>✉️</div>
                Select a message to read
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
