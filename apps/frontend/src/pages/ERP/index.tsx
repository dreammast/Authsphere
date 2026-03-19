import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { SectionHeader, Card, Badge, Skeleton } from '../../components/ui';
import { JWTStatusStrip } from '../../components/ui/JWTStatusStrip';

interface ERPDashboard {
  student: { display_name:string; student_id:string; dept:string };
  fees: { id:string; semester:number; amount:number; due_date:string; paid_at:string|null; status:string; description:string }[];
  hostel: { room_no:string; block:string; allocated_at:string } | null;
  transport: { route_name:string; stops:string; departure_time:string; valid_until:string } | null;
  pending_fees: number;
}

const statusBadge = { paid:'active', due:'pending', overdue:'error' } as const;

export default function ERPPage() {
  const [data,    setData]    = useState<ERPDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/erp/dashboard').then((r) => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>🏛️ Enterprise Resource Portal</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:24 }}>// SAP / Oracle · Fees, hostel, transport</div>
      <JWTStatusStrip />

      {loading ? <Skeleton height={200} /> : data && (
        <>
          {/* Student info */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--purple))',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800 }}>
                {data.student.display_name.split(' ').map(w=>w[0]).join('').substring(0,2)}
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:700 }}>{data.student.display_name}</div>
                <div style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{data.student.student_id}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>{data.student.dept}</div>
              </div>
              {data.pending_fees > 0 && (
                <div style={{ marginLeft:'auto', textAlign:'right' }}>
                  <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>PENDING DUES</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'var(--red)' }}>₹{data.pending_fees.toLocaleString('en-IN')}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Fee records */}
          <SectionHeader title="Fee Records" tag="SEMESTER-WISE" />
          <Card style={{ marginBottom:20 }}>
            {data.fees.map((fee) => (
              <div key={fee.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:20 }}>{fee.status==='paid'?'✅':fee.status==='overdue'?'🔴':'🕐'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{fee.description}</div>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                    Semester {fee.semester} · Due: {new Date(fee.due_date).toLocaleDateString()}
                    {fee.paid_at && ` · Paid: ${new Date(fee.paid_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16, fontWeight:700, color: fee.status==='paid'?'var(--green)':fee.status==='overdue'?'var(--red)':'var(--amber)' }}>
                    ₹{fee.amount.toLocaleString('en-IN')}
                  </div>
                  <Badge variant={statusBadge[fee.status as keyof typeof statusBadge] ?? 'info'} dot>
                    {fee.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Hostel */}
            <Card>
              <SectionHeader title="Hostel" />
              {data.hostel ? (
                <div>
                  <div style={{ fontSize:32, marginBottom:8 }}>🏠</div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{data.hostel.block} · Room {data.hostel.room_no}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>
                    Allotted: {new Date(data.hostel.allocated_at).toLocaleDateString()}
                  </div>
                  <Badge variant="active" dot style={{ marginTop:8 }}>ALLOTTED</Badge>
                </div>
              ) : (
                <div style={{ color:'var(--muted)', fontSize:13 }}>No hostel allotment</div>
              )}
            </Card>

            {/* Transport */}
            <Card>
              <SectionHeader title="Transport" />
              {data.transport ? (
                <div>
                  <div style={{ fontSize:32, marginBottom:8 }}>🚌</div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{data.transport.route_name}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{data.transport.stops}</div>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--accent)' }}>
                    Departs: {data.transport.departure_time}
                  </div>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                    Valid until: {new Date(data.transport.valid_until).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div style={{ color:'var(--muted)', fontSize:13 }}>No transport pass</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
