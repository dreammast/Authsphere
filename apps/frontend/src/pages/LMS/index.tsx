import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { SectionHeader, Card, Badge, ProgressBar, Skeleton } from '../../components/ui';
import { JWTStatusStrip } from '../../components/ui/JWTStatusStrip';

interface LMSDashboard {
  enrollments: { course_code:string; course_name:string; credits:number; faculty_name:string }[];
  upcoming_assignments: { id:string; title:string; due_date:string; max_marks:number }[];
  grade_summary: { total:number; average:number };
  attendance_rate: number;
}

export default function LMSPage() {
  const [data,    setData]    = useState<LMSDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'courses'|'grades'|'assignments'|'attendance'>('courses');

  useEffect(() => {
    api.get('/api/lms/dashboard')
      .then((r) => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>
        📚 Learning Management System
      </div>
      <div style={{ fontSize:13, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:24 }}>
        // Moodle / Canvas · Courses, grades, assignments
      </div>

      <JWTStatusStrip />

      {/* Summary stats */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {Array(4).fill(0).map((_,i) => <div key={i} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}><Skeleton height={32} /><Skeleton width="70%" height={12} /></div>)}
        </div>
      ) : data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
          {[
            { val: data.enrollments.length,     label:'Enrolled Courses',  color:'var(--accent)' },
            { val: data.grade_summary.average+'%', label:'Grade Average',  color:'var(--green)' },
            { val: data.upcoming_assignments.length, label:'Due Assignments', color:'var(--amber)' },
            { val: data.attendance_rate+'%',    label:'Attendance Rate',   color: data.attendance_rate < 75 ? 'var(--red)' : 'var(--green)' },
          ].map((s) => (
            <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:32, fontWeight:800, letterSpacing:-1, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)', marginTop:6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {(['courses','grades','assignments','attendance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, cursor:'pointer',
              background: tab===t ? 'rgba(0,212,255,0.08)' : 'transparent',
              border: `1px solid ${tab===t ? 'rgba(0,212,255,0.2)' : 'var(--border)'}`,
              color: tab===t ? 'var(--accent)' : 'var(--muted)',
              fontFamily:'var(--font-sans)', fontWeight:600, transition:'all 0.2s' }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading…</div>}

      {!loading && data && tab === 'courses' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {data.enrollments.map((c, i) => (
            <Card key={i}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--accent)', marginBottom:4 }}>{c.course_code}</div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{c.course_name}</div>
                </div>
                <Badge variant="info">{c.credits} cr</Badge>
              </div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>👨‍🏫 {c.faculty_name}</div>
            </Card>
          ))}
        </div>
      )}

      {!loading && data && tab === 'assignments' && (
        <Card>
          <SectionHeader title="Upcoming Assignments" />
          {data.upcoming_assignments.length === 0 ? (
            <div style={{ color:'var(--muted)', fontSize:13 }}>No upcoming assignments</div>
          ) : (
            data.upcoming_assignments.map((a) => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
                borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:18 }}>📝</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{a.title}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>
                    Due: {new Date(a.due_date).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="pending">Max {a.max_marks}m</Badge>
              </div>
            ))
          )}
        </Card>
      )}

      {!loading && data && tab === 'attendance' && (
        <Card>
          <SectionHeader title="Attendance Summary" />
          <ProgressBar value={data.attendance_rate} color={data.attendance_rate < 75 ? 'red' : 'green'}
            label="Overall Attendance" showPct height={10} />
          {data.attendance_rate < 75 && (
            <div style={{ marginTop:12, padding:12, borderRadius:8, background:'rgba(239,68,68,0.06)',
              border:'1px solid rgba(239,68,68,0.2)', fontSize:12, color:'var(--red)' }}>
              ⚠️ Attendance below 75% requirement. Contact your advisor.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
