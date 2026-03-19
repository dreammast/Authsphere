import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import styles from './AdminDashboard.module.css';
import { AuditLogFeed } from '../../../components/ui/AuditLogFeed';

interface DashboardStats {
  totalStudents: number;
  feeCollectedThisMonth: number;
  pendingDues: number;
  defaultersCount: number;
  activeSessionsCount: number;
  fidoAdoptionRate: number;
  booksOverdue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeChart, setFeeChart] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, chartRes] = await Promise.all([
        api.get('/api/admin/dashboard/stats'),
        api.get('/api/admin/dashboard/fee-chart')
      ]);
      setStats(statsRes.data.data);
      setFeeChart(chartRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Loading university analytics...</p>
      </div>
    );
  }

  return (
    <div className={`fade-in ${styles.dashboard}`}>
      <div className={styles.header}>
        <h2>System Overview</h2>
        <div className={styles.lastUpdate}>Live Data Feed Active</div>
      </div>

      {stats && (
        <div className={styles.statsGrid}>
          <StatCard title="Total Students" value={stats.totalStudents} icon="🎓" />
          <StatCard title="Collected This Month" value={formatCurrency(stats.feeCollectedThisMonth)} icon="💰" color="green" />
          <StatCard title="Outstanding Dues" value={formatCurrency(stats.pendingDues)} icon="⚠️" color="orange" />
          <StatCard title="Fee Defaulters" value={stats.defaultersCount} icon="🛑" color="red" />
          <StatCard title="Active Sessions" value={stats.activeSessionsCount} icon="🌐" color="blue" />
          <StatCard title="FIDO2 Adoption" value={`${stats.fidoAdoptionRate}%`} icon="🔐" color="cyan" />
          <StatCard title="Books Overdue" value={stats.booksOverdue} icon="📚" color="orange" />
        </div>
      )}

      <div className={styles.mainGrid}>
        {/* Fee Collection Trend */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Fee Collection Trend (6 Months)</h3>
          </div>
          <div className={styles.chartContainer}>
            {feeChart.length > 0 ? (
               <div className={styles.barChart}>
                  {feeChart.map((data, i) => {
                    const max = Math.max(...feeChart.map(d => d.total)) || 1;
                    const heightPct = (data.total / max) * 100;
                    return (
                      <div key={i} className={styles.barWrapper}>
                        <div className={styles.barValue}>{formatCurrency(data.total)}</div>
                        <div className={styles.bar} style={{ height: `${heightPct}%` }}></div>
                        <div className={styles.barLabel}>{data.month}</div>
                      </div>
                    );
                  })}
               </div>
            ) : (
               <div className={styles.emptyState}>No data available for trend</div>
            )}
          </div>
        </div>

        {/* Live Audit Log Section */}
         <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Live Authentication Stream</h3>
            <span className={styles.liveIndicator}></span>
          </div>
          <div className={styles.auditWrapper}>
            <AuditLogFeed limit={10} hideHeader />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = 'default' }: { title: string, value: string | number, icon: string, color?: string }) {
  return (
    <div className={`${styles.statCard} ${styles[`color-${color}`]}`}>
      <div className={styles.statTop}>
        <div className={styles.statTitle}>{title}</div>
        <div className={styles.statIcon}>{icon}</div>
      </div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}
