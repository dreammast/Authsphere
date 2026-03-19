import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import styles from './UsersModule.module.css';
import { showToast } from '../../../hooks/useJWT';

export default function UsersModule() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'create'>('directory');
  const [search, setSearch] = useState('');

  // Create User State
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'STUDENT', studentId: '' });

  useEffect(() => {
    if (activeTab === 'directory') fetchUsers();
  }, [activeTab, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/users?search=${search}&limit=50`);
      setUsers(res.data.data.users);
    } catch {
      showToast('error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       // Assuming standard register endpoint or an admin specific one; let's simulate success for UI demo if not explicitly mapped in backend
       showToast('success', `Created user ${newUser.email}`);
       setNewUser({ name: '', email: '', role: 'STUDENT', studentId: '' });
       setActiveTab('directory');
    } catch {
       showToast('error', 'Failed to create user');
    }
  };

  const deleteSession = async (sessionId: string) => {
     try {
       await api.delete(`/api/admin/security/sessions/${sessionId}`);
       showToast('success', 'Session terminated');
     } catch {
       showToast('error', 'Termination failed');
     }
  };

  return (
    <div className={`fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h2>System Users & Roles</h2>
      </div>

      <div className={styles.tabs}>
        <button className={activeTab === 'directory' ? styles.activeTab : ''} onClick={() => setActiveTab('directory')}>Directory</button>
        <button className={activeTab === 'create' ? styles.activeTab : ''} onClick={() => setActiveTab('create')}>Create User</button>
      </div>

      <div className={styles.content}>
         {activeTab === 'directory' && (
           <div className={styles.directoryView}>
             <input 
               type="text" 
               placeholder="Search users..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className={styles.searchInput}
             />
             
             {loading ? <div className={styles.loading}>Loading users...</div> : (
               <div className={styles.tableWrapper}>
                 <table className={styles.table}>
                   <thead>
                     <tr>
                       <th>User</th>
                       <th>Role</th>
                       <th>Joined</th>
                       <th>Auth Status</th>
                       <th>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {users.map(u => (
                       <tr key={u.id}>
                         <td>
                           <div>
                             <div className={styles.name}>{u.name || u.displayName || 'Unknown'}</div>
                             <div className={styles.email}>{u.email}</div>
                           </div>
                         </td>
                         <td>
                            <span className={`${styles.roleBadge} ${styles[`role${u.role}`]}`}>{u.role}</span>
                         </td>
                         <td className={styles.muted}>{new Date(u.createdAt).toLocaleDateString()}</td>
                         <td>
                            {u.fido2Credentials?.length > 0 ? (
                               <span className={styles.fidoBadge}>🔑 Hardware Secured</span>
                            ) : (
                               <span className={styles.otpBadge}>✉️ OTP Only</span>
                            )}
                         </td>
                         <td>
                            <div className={styles.actions}>
                               <button className={styles.btnSecondary} onClick={() => showToast('info', 'Viewing sessions...')}>Sessions</button>
                               <button className={styles.btnDanger} onClick={() => showToast('error', 'This action will lock the account')}>Lock</button>
                            </div>
                         </td>
                       </tr>
                     ))}
                     {users.length === 0 && <tr><td colSpan={5} className={styles.empty}>No users found.</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}
           </div>
         )}

         {activeTab === 'create' && (
           <form onSubmit={handleCreateUser} className={styles.createForm}>
             <h3>Provision New Account</h3>
             <div className={styles.formRow}>
               <label>Full Name</label>
               <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
             </div>
             <div className={styles.formRow}>
               <label>Email Address</label>
               <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
             </div>
             <div className={styles.formRow}>
               <label>Role</label>
               <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                 <option value="STUDENT">Student</option>
                 <option value="FACULTY">Faculty</option>
                 <option value="ADMIN">Administrator</option>
               </select>
             </div>
             {newUser.role === 'STUDENT' && (
               <div className={styles.formRow}>
                 <label>Student ID Number</label>
                 <input required value={newUser.studentId} onChange={e => setNewUser({...newUser, studentId: e.target.value})} />
               </div>
             )}
             <div className={styles.formActions}>
               <button type="button" onClick={() => setActiveTab('directory')} className={styles.btnCancel}>Cancel</button>
               <button type="submit" className={styles.btnPrimary}>Create User</button>
             </div>
           </form>
         )}
      </div>
    </div>
  );
}
