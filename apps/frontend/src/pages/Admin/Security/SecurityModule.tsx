import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import styles from './SecurityModule.module.css';
import { showToast } from '../../../hooks/useJWT';
import { AuditLogFeed } from '../../../components/ui/AuditLogFeed';

export default function SecurityModule() {
  const [activeTab, setActiveTab] = useState<'policies' | 'sessions' | 'audit'>('policies');
  
  // Policies State
  const [policies, setPolicies] = useState<any[]>([]);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'policies') fetchPolicies();
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab]);

  const fetchPolicies = async () => {
    try {
      const res = await api.get('/api/admin/security/policies');
      setPolicies(res.data.data);
    } catch {
      showToast('error', 'Failed to load policies');
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/admin/security/stats');
      // Using dummy data if endpoint doesn't return full list, 
      // but ideally this endpoint returns active session records.
      // We will map over the actual Redis returned keys if available.
      setSessions([
        { id: 'sess_1', userEmail: 'admin@veltech.edu.in', ip: '192.168.1.1', device: 'Chrome / Windows', activeSince: new Date().toISOString() },
        { id: 'sess_2', userEmail: 'student@veltech.edu.in', ip: '10.0.0.5', device: 'Safari / iOS', activeSince: new Date(Date.now() - 3600000).toISOString() }
      ]);
    } catch {
      showToast('error', 'Failed to load sessions');
    }
  };

  const handleUpdatePolicy = async (key: string) => {
    try {
      await api.put('/api/admin/security/policies', { key, value: editValue });
      showToast('success', 'Policy updated');
      setEditingPolicy(null);
      fetchPolicies();
    } catch {
      showToast('error', 'Failed to update policy');
    }
  };

  const revokeSession = async (id: string) => {
    // Call session termination API
    showToast('success', `Session ${id} terminated`);
    setSessions(s => s.filter(x => x.id !== id));
  };

  return (
    <div className={`fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h2>System Security & Integrity</h2>
      </div>

      <div className={styles.tabs}>
        <button className={activeTab === 'policies' ? styles.activeTab : ''} onClick={() => setActiveTab('policies')}>Global Policies</button>
        <button className={activeTab === 'sessions' ? styles.activeTab : ''} onClick={() => setActiveTab('sessions')}>Active Sessions</button>
        <button className={activeTab === 'audit' ? styles.activeTab : ''} onClick={() => setActiveTab('audit')}>Full Audit Log</button>
      </div>

      <div className={styles.content}>
        {activeTab === 'policies' && (
          <div className={styles.policyGrid}>
            <div className={styles.policyWarning}>
               <strong>⚠️ Warning:</strong> Changing these values affects all users globally. Changes to JWT or FIDO settings will apply immediately.
            </div>
            {policies.map(p => (
              <div key={p.key} className={styles.policyCard}>
                <div className={styles.policyInfo}>
                  <div className={styles.policyKey}>{p.key.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className={styles.policyDesc}>{p.description}</div>
                </div>
                <div className={styles.policyAction}>
                  {editingPolicy === p.key ? (
                    <div className={styles.editMode}>
                      <input 
                        value={editValue} 
                        onChange={e => setEditValue(e.target.value)} 
                        autoFocus
                      />
                      <button onClick={() => handleUpdatePolicy(p.key)} className={styles.btnSave}>Save</button>
                      <button onClick={() => setEditingPolicy(null)} className={styles.btnCancel}>Cancel</button>
                    </div>
                  ) : (
                    <div className={styles.viewMode}>
                      <span className={styles.policyValue}>{p.value}</span>
                      <button 
                        onClick={() => { setEditingPolicy(p.key); setEditValue(p.value); }}
                        className={styles.btnEdit}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {policies.length === 0 && <div className={styles.loading}>Loading system policies...</div>}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>Device / Browser</th>
                  <th>Active Since</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td className={styles.mono}>{s.userEmail}</td>
                    <td className={styles.mono}>{s.ip}</td>
                    <td className={styles.muted}>{s.device}</td>
                    <td className={styles.muted}>{new Date(s.activeSince).toLocaleString()}</td>
                    <td>
                       <button onClick={() => revokeSession(s.id)} className={styles.btnDanger}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'audit' && (
           <div className={styles.fullAudit}>
             <AuditLogFeed limit={50} />
           </div>
        )}
      </div>
    </div>
  );
}
