import { useState } from 'react';
import api from '../../../lib/api';
import styles from './MessagesModule.module.css';
import { showToast } from '../../../hooks/useJWT';

export default function MessagesModule() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  
  // Compose State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [targetRole, setTargetRole] = useState('ALL');
  const [isSending, setIsSending] = useState(false);

  // History State
  const [history, setHistory] = useState<any[]>([]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    
    try {
      setIsSending(true);
      await api.post('/api/admin/messages/broadcast', {
        title,
        content,
        priority,
        targetRole: targetRole === 'ALL' ? undefined : targetRole
      });
      showToast('success', 'Announcement Broadcasted Successfully');
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setTargetRole('ALL');
    } catch {
      showToast('error', 'Failed to broadcast message');
    } finally {
      setIsSending(false);
    }
  };

  const fetchHistory = async () => {
    try {
      // Assuming GET /api/admin/messages returns past broadcasts
      // Placeholder for actual implementation if it exists, otherwise empty for now
      setHistory([]); 
    } catch {
      showToast('error', 'Failed to fetch history');
    }
  };

  return (
    <div className={`fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h2>Campus Announcements & Messaging</h2>
      </div>

      <div className={styles.tabs}>
        <button className={activeTab === 'compose' ? styles.activeTab : ''} onClick={() => setActiveTab('compose')}>Compose Broadcast</button>
        <button className={activeTab === 'history' ? styles.activeTab : ''} onClick={() => { setActiveTab('history'); fetchHistory(); }}>Broadcast History</button>
      </div>

      <div className={styles.content}>
        {activeTab === 'compose' && (
          <form className={styles.composeForm} onSubmit={handleBroadcast}>
             <div className={styles.formSplit}>
                <div className={styles.mainCol}>
                   <div className={styles.formRow}>
                     <label>Announcement Title</label>
                     <input 
                       required 
                       placeholder="e.g. End of Semester Examinations Update" 
                       value={title} 
                       onChange={e => setTitle(e.target.value)} 
                       maxLength={100}
                     />
                   </div>
                   
                   <div className={styles.formRow}>
                     <label>Message Content</label>
                     <textarea 
                       required 
                       placeholder="Type your announcement here..." 
                       value={content} 
                       onChange={e => setContent(e.target.value)}
                       rows={10}
                     />
                   </div>
                </div>
                
                <div className={styles.sideCol}>
                   <div className={styles.settingsCard}>
                      <h3>Delivery Settings</h3>
                      
                      <div className={styles.formRow}>
                        <label>Target Audience</label>
                        <select value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                          <option value="ALL">Everyone (All Portal Users)</option>
                          <option value="STUDENT">Students Only</option>
                          <option value="FACULTY">Faculty & Staff Only</option>
                        </select>
                      </div>

                      <div className={styles.formRow}>
                        <label>Priority Level</label>
                        <select value={priority} onChange={e => setPriority(e.target.value)}>
                          <option value="LOW">Low (Silent)</option>
                          <option value="NORMAL">Normal</option>
                          <option value="HIGH">High (Important Alert)</option>
                        </select>
                      </div>

                      <div className={styles.infoBox}>
                         <span className={styles.infoIcon}>💡</span>
                         <p>High priority messages will appear as an urgent banner for users upon their next login.</p>
                      </div>
                   </div>
                   
                   <button type="submit" disabled={isSending} className={styles.btnPrimary}>
                      {isSending ? 'Broadcasting...' : 'Broadcast Announcement'}
                   </button>
                </div>
             </div>
          </form>
        )}

        {activeTab === 'history' && (
          <div className={styles.historyView}>
             <table className={styles.table}>
               <thead>
                 <tr>
                   <th>Title</th>
                   <th>Target</th>
                   <th>Priority</th>
                   <th>Sent At</th>
                 </tr>
               </thead>
               <tbody>
                 {history.length === 0 ? (
                    <tr><td colSpan={4} className={styles.empty}>No past broadcasts found.</td></tr>
                 ) : history.map((item, idx) => (
                    <tr key={idx}>
                       <td className={styles.bold}>{item.title}</td>
                       <td><span className={styles.badge}>{item.targetRole || 'ALL'}</span></td>
                       <td><span className={`${styles.badge} ${styles['priority'+item.priority]}`}>{item.priority}</span></td>
                       <td className={styles.muted}>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}
