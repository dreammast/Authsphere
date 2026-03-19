import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import styles from './FeesModule.module.css';
import { showToast } from '../../../hooks/useJWT';

export default function FeesModule() {
  const [activeTab, setActiveTab] = useState<'overview' | 'collect' | 'defaulters' | 'structure'>('overview');
  
  // Overview State
  const [overview, setOverview] = useState<any>(null);
  
  // Collect State
  const [searchEmail, setSearchEmail] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('ONLINE');
  const [receipt, setReceipt] = useState<any>(null);

  // Structure State
  const [structures, setStructures] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'structure') fetchStructures();
  }, [activeTab]);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/api/admin/fees/overview');
      setOverview(res.data.data);
    } catch {
      showToast('error', 'Failed to fetch fee overview');
    }
  };

  const fetchStructures = async () => {
    try {
      const res = await api.get('/api/admin/fees/structures');
      setStructures(res.data.data);
    } catch {
      showToast('error', 'Failed to fetch fee structures');
    }
  };

  const handleSearchStudent = async () => {
    try {
      // For simplicity, we search by exact email here. Ideally, a typeahead from the /students endpoint.
      const res = await api.get(`/api/admin/students?search=${searchEmail}`);
      const found = res.data.data.students.find((s:any) => s.email === searchEmail);
      if (found) {
        setStudent(found);
      } else {
        showToast('error', 'Student not found');
        setStudent(null);
      }
    } catch {
      showToast('error', 'Search failed');
    }
  };

  const handleCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !amount) return;
    try {
      const res = await api.post('/api/admin/fees/collect', {
        userId: student.id,
        amount: Number(amount),
        description: 'Manual Fee Collection',
        paymentMode
      });
      showToast('success', 'Fee collected successfully');
      setReceipt(res.data.data.receipt);
      setAmount('');
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Collection failed');
    }
  };

  return (
    <div className={`fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h2>Fee Management Portal</h2>
      </div>

      <div className={styles.tabs}>
        <button className={activeTab === 'overview' ? styles.activeTab : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'collect' ? styles.activeTab : ''} onClick={() => setActiveTab('collect')}>Collect Fees</button>
        <button className={activeTab === 'structure' ? styles.activeTab : ''} onClick={() => setActiveTab('structure')}>Fee Structure</button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
             <div className={styles.statCard}>
                <h4>Total Collected</h4>
                <div className={styles.amount}>₹{(overview?.totalCollected || 0).toLocaleString()}</div>
             </div>
             <div className={styles.statCard}>
                <h4>Total Pending</h4>
                <div className={`${styles.amount} ${styles.danger}`}>₹{(overview?.totalPending || 0).toLocaleString()}</div>
             </div>
             <div className={styles.statCard}>
                <h4>Total Defaulters</h4>
                <div className={styles.amount}>{overview?.defaultersCount || 0} Students</div>
             </div>
          </div>
        )}

        {activeTab === 'collect' && (
          <div className={styles.collectForm}>
            <div className={styles.searchSection}>
              <h3>Find Student</h3>
              <div className={styles.inputGroup}>
                <input 
                  type="email" 
                  placeholder="Student Email (e.g. stu1@veltech.edu.in)" 
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                />
                <button onClick={handleSearchStudent}>Search</button>
              </div>
            </div>

            {student && !receipt && (
              <form onSubmit={handleCollectFee} className={styles.paymentSection}>
                <h3>Record Payment for {student.name}</h3>
                <div className={styles.formRow}>
                  <label>Amount (₹)</label>
                  <input type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className={styles.formRow}>
                  <label>Payment Mode</label>
                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                    <option value="ONLINE">Online Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="DD">Demand Draft</option>
                  </select>
                </div>
                <button type="submit" className={styles.submitBtn}>Generate Receipt</button>
              </form>
            )}

            {receipt && (
              <div className={styles.receiptCard}>
                <div className={styles.receiptHeader}>✅ Payment Successful</div>
                <div className={styles.receiptBody}>
                  <p><strong>Receipt No:</strong> {receipt.receiptNo}</p>
                  <p><strong>Student:</strong> {student?.name}</p>
                  <p><strong>Amount Paid:</strong> ₹{receipt.amountPaid}</p>
                  <p><strong>Date:</strong> {new Date(receipt.createdAt).toLocaleString()}</p>
                  <p><strong>Mode:</strong> {receipt.paymentMode}</p>
                </div>
                <button onClick={() => { setReceipt(null); setStudent(null); setSearchEmail(''); }} className={styles.btnSecondary}>Record Another</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'structure' && (
          <div className={styles.structureList}>
            <div className={styles.sectionHeader}>
               <h3>Current Fee Structures</h3>
               <button className={styles.btnSecondary}>Add New</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Semester</th>
                  <th>Tuition Fee</th>
                  <th>Hostel Fee</th>
                  <th>Transport Fee</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s:any) => (
                  <tr key={s.id}>
                    <td>{s.program}</td>
                    <td>{s.semester}</td>
                    <td>₹{s.tuitionFee}</td>
                    <td>₹{s.hostelFee}</td>
                    <td>₹{s.transportFee}</td>
                  </tr>
                ))}
                {structures.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:20}}>No active structures</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
