import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import styles from './StudentsModule.module.css';
import { showToast } from '../../../hooks/useJWT';

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
  isActive: boolean;
  fidoStatus: string;
  feeStatus: string;
}

export default function StudentsModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [drawerData, setDrawerData] = useState<any>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, page]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/students?search=${search}&skip=${page * 20}`);
      setStudents(res.data.data.students);
      setTotal(res.data.data.total);
    } catch (err) {
      showToast('error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async (student: Student) => {
    setSelectedStudent(student);
    try {
      const res = await api.get(`/api/admin/students/${student.id}`);
      setDrawerData(res.data.data);
    } catch {
      showToast('error', 'Profile load failed');
    }
  };

  const closeProfile = () => {
    setSelectedStudent(null);
    setDrawerData(null);
  };

  return (
    <div className={`fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h2>Student Directory</h2>
        <div className={styles.actions}>
          <input 
            type="text" 
            placeholder="Search name, ID, or email..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading && students.length === 0 ? (
           <div className={styles.loading}>Loading directory...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>ID Number</th>
                <th>Email</th>
                <th>Auth Status</th>
                <th>Account Dues</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>{s.name.charAt(0)}</div>
                      <span className={styles.name}>{s.name}</span>
                    </div>
                  </td>
                  <td className={styles.mono}>{s.studentId}</td>
                  <td className={styles.muted}>{s.email}</td>
                  <td>
                    <span className={`${styles.badge} ${s.fidoStatus === 'Registered' ? styles.badgeGreen : styles.badgeMuted}`}>
                      {s.fidoStatus === 'Registered' ? '🔑 FIDO2 Active' : 'OTP Only'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${s.feeStatus === 'Defaulter' ? styles.badgeRed : styles.badgeGreen}`}>
                      {s.feeStatus}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => openProfile(s)} className={styles.btnAction}>View Profile</button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={6} className={styles.empty}>No students found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {total > 20 && (
           <div className={styles.pagination}>
             <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
             <span>Page {page + 1} of {Math.ceil(total / 20)}</span>
             <button disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
           </div>
        )}
      </div>

      {/* Side Drawer Profile */}
      <div className={`${styles.drawer} ${selectedStudent ? styles.drawerOpen : ''}`}>
        {selectedStudent && (
          <div className={styles.drawerContent}>
            <div className={styles.drawerHeader}>
               <h3>Student Profile</h3>
               <button onClick={closeProfile} className={styles.closeBtn}>&times;</button>
            </div>
            <div className={styles.profileHero}>
               <div className={styles.heroAvatar}>{selectedStudent.name.charAt(0)}</div>
               <div className={styles.heroName}>{selectedStudent.name}</div>
               <div className={styles.heroId}>{selectedStudent.studentId}</div>
            </div>

            {drawerData ? (
               <div className={styles.drawerBody}>
                 <section className={styles.section}>
                    <h4>Financial Status</h4>
                    {drawerData.feeRecords?.length > 0 ? (
                      <ul className={styles.list}>
                        {drawerData.feeRecords.map((r: any) => (
                           <li key={r.id}>
                             <span className={styles.muted}>{r.description}</span>
                             <span className={r.status === 'OVERDUE' ? styles.dangerText : styles.successText}>₹{r.amount}</span>
                           </li>
                        ))}
                      </ul>
                    ) : <span className={styles.muted}>No records</span>}
                 </section>
                 
                 <section className={styles.section}>
                    <h4>Recent Activity Logs</h4>
                    <ul className={styles.list}>
                      {drawerData.auditLogs?.slice(0,5).map((log: any) => (
                         <li key={log.id} style={{fontSize: '0.8rem'}}>
                           <span>{log.action}</span>
                           <span className={styles.muted}>{new Date(log.createdAt).toLocaleDateString()}</span>
                         </li>
                      ))}
                    </ul>
                 </section>

                 <div className={styles.drawerActions}>
                    <button className={styles.btnDanger}>Lock Account</button>
                    <button className={styles.btnSecondary} onClick={() => {
                        api.delete(`/api/admin/users/${selectedStudent.id}/credentials`).then(() => showToast('success', 'FIDO2 reset'));
                    }}>Reset FIDO2</button>
                 </div>
               </div>
            ) : (
               <div className={styles.loading}>Loading data...</div>
            )}
          </div>
        )}
      </div>
      {selectedStudent && <div className={styles.drawerOverlay} onClick={closeProfile} />}
    </div>
  );
}
