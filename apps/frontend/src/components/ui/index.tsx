import React from 'react';

// ── Badge ─────────────────────────────────────────────────
type BadgeVariant = 'active' | 'pending' | 'error' | 'info' | 'admin' | 'student' | 'faculty';

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  active:  { background:'rgba(16,185,129,0.12)', color:'var(--green)',  border:'1px solid rgba(16,185,129,0.25)' },
  pending: { background:'rgba(245,158,11,0.12)', color:'var(--amber)',  border:'1px solid rgba(245,158,11,0.25)' },
  error:   { background:'rgba(239,68,68,0.1)',   color:'var(--red)',    border:'1px solid rgba(239,68,68,0.2)' },
  info:    { background:'rgba(0,212,255,0.08)',   color:'var(--accent)', border:'1px solid rgba(0,212,255,0.2)' },
  admin:   { background:'rgba(124,58,237,0.1)',   color:'var(--purple)', border:'1px solid rgba(124,58,237,0.2)' },
  student: { background:'rgba(16,185,129,0.08)',  color:'var(--green)',  border:'1px solid rgba(16,185,129,0.2)' },
  faculty: { background:'rgba(0,212,255,0.08)',   color:'var(--accent)', border:'1px solid rgba(0,212,255,0.2)' },
};

export const Badge: React.FC<{ variant?: BadgeVariant; dot?: boolean; children: React.ReactNode }> = ({
  variant = 'info', dot, children,
}) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
    borderRadius:20, fontSize:11, fontFamily:'var(--font-mono)', fontWeight:500,
    ...badgeStyles[variant] }}>
    {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor' }} />}
    {children}
  </span>
);

// ── Avatar ────────────────────────────────────────────────
const avatarColors = [
  { bg:'linear-gradient(135deg,var(--accent),var(--purple))', color:'#fff' },
  { bg:'linear-gradient(135deg,var(--green),var(--accent))',  color:'#fff' },
  { bg:'linear-gradient(135deg,var(--purple),var(--pink))',   color:'#fff' },
  { bg:'linear-gradient(135deg,var(--amber),var(--red))',     color:'#fff' },
];

const sizeMap = { sm: { size:32, font:12 }, md: { size:44, font:16 }, lg: { size:60, font:22 } };

export const Avatar: React.FC<{ name: string; size?: 'sm'|'md'|'lg'; colorIndex?: number }> = ({
  name, size = 'sm', colorIndex,
}) => {
  const initials = name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
  const ci = colorIndex ?? (name.charCodeAt(0) % 4);
  const { size: sz, font } = sizeMap[size];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:sz, height:sz, borderRadius:'50%', fontSize:font, fontWeight:700,
      flexShrink:0, ...avatarColors[ci] }}>
      {initials}
    </span>
  );
};

// ── ProgressBar ───────────────────────────────────────────
type ProgressColor = 'accent' | 'green' | 'amber' | 'red';

const fillColor: Record<ProgressColor, string> = {
  accent: 'linear-gradient(90deg,var(--accent),var(--purple))',
  green:  'var(--green)',
  amber:  'var(--amber)',
  red:    'var(--red)',
};

export const ProgressBar: React.FC<{
  value: number; color?: ProgressColor; height?: number; label?: string; showPct?: boolean;
}> = ({ value, color = 'accent', height = 6, label, showPct }) => (
  <div>
    {(label || showPct) && (
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11,
        fontFamily:'var(--font-mono)', color:'var(--muted)', marginBottom:6 }}>
        {label && <span>{label}</span>}
        {showPct && <span style={{ color: fillColor[color].startsWith('var') ? fillColor[color] : 'var(--accent)' }}>{value}%</span>}
      </div>
    )}
    <div style={{ height, background:'var(--border)', borderRadius:height/2, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(value,100)}%`, borderRadius:height/2,
        background: fillColor[color], transition:'width 0.4s ease' }} />
    </div>
  </div>
);

// ── Spinner ───────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'var(--accent)' }) => (
  <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%',
    border:`2px solid rgba(0,212,255,0.2)`, borderTopColor:color,
    animation:'spin 0.7s linear infinite', flexShrink:0 }} />
);

// ── Skeleton ──────────────────────────────────────────────
export const Skeleton: React.FC<{ width?: string|number; height?: number; className?: string }> = ({
  width = '100%', height = 12,
}) => (
  <div style={{ width, height, borderRadius:4,
    background:'linear-gradient(90deg,var(--border) 25%,var(--border2) 50%,var(--border) 75%)',
    backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
);

// ── LiveBadge ─────────────────────────────────────────────
export const LiveBadge: React.FC = () => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:9,
    fontFamily:'var(--font-mono)', background:'rgba(16,185,129,0.1)', color:'var(--green)',
    border:'1px solid rgba(16,185,129,0.2)', padding:'2px 8px', borderRadius:5 }}>
    <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', animation:'pulse 1.5s infinite' }} />
    LIVE
  </span>
);

// ── Card ──────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({
  children, style, className,
}) => (
  <div className={className} style={{ background:'var(--card)', border:'1px solid var(--border)',
    borderRadius:14, padding:20, ...style }}>
    {children}
  </div>
);

// ── SectionHeader ─────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; tag?: string; action?: React.ReactNode }> = ({
  title, tag, action,
}) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
    <span style={{ fontSize:18, fontWeight:700, letterSpacing:-0.3 }}>{title}</span>
    {tag && (
      <span style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:2,
        color:'var(--accent)', background:'rgba(0,212,255,0.06)',
        border:'1px solid rgba(0,212,255,0.15)', padding:'3px 10px', borderRadius:5 }}>
        {tag}
      </span>
    )}
    {action && <div style={{ marginLeft:'auto' }}>{action}</div>}
  </div>
);
