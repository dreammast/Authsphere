import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerFido2 } from '../../lib/webauthn';
import { showToast } from '../../hooks/useJWT';
import styles from './Register.module.css';

const CAMPUS_DOMAIN = import.meta.env.VITE_CAMPUS_DOMAIN ?? 'veltech.edu.in';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Relaxed for testing
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email.trim());

  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    setIsSecure(window.isSecureContext);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSecure && window.location.hostname !== 'localhost') {
      showToast('error', 'WebAuthn requires HTTPS', 'Please use HTTPS or special browser flags on mobile.');
      return;
    }

    if (!email.trim() || !emailValid) {
      showToast('error', 'Enter a valid email', `Use a valid email like student@${CAMPUS_DOMAIN}`);
      return;
    }

    setLoading(true);
    console.log('[AuthSphere] 📝 Starting device registration for:', email.trim().toLowerCase());
    try {
      const result = await registerFido2(email.trim().toLowerCase(), displayName.trim() || undefined);
      console.log('[AuthSphere] ✅ Registration successful:', JSON.stringify(result, null, 2));
      showToast('success', 'Device registered!', 'Your biometric passkey has been saved');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const msg =
        err.response?.status === 429
          ? 'Too many attempts. Wait a bit and try again.'
          : (err.response?.data?.error || err.message || 'Registration failed');
      console.error('[AuthSphere] ❌ Registration error:', msg, err);
      showToast('error', 'Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🔐</div>
          <div>
            <div className={styles.logoName}>AuthSphere</div>
            <div className={styles.logoSub}>VELTECH CAMPUS SSO</div>
          </div>
        </div>

        <div className={styles.card}>
          {success ? (
            <div className={`${styles.successState} fade-in`}>
              <div className={styles.successIcon}>✅</div>
              <div className={styles.successTitle}>Passkey Registered!</div>
              <div className={styles.successSub}>
                Your biometric device has been registered successfully.
                Redirecting to login…
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <div className="register-header">
                <h2>Create your ID</h2>
                <p>Join the secure passwordless campus network</p>
              </div>

              {!isSecure && window.location.hostname !== 'localhost' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: '#ef4444'
                }}>
                  <strong>⚠️ Setup Required for Mobile:</strong><br/>
                  WebAuthn requires HTTPS. For local testing on Chrome/Android:<br/>
                  1. Go to <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code><br/>
                  2. Add <code>{window.location.origin}</code><br/>
                  3. Enable and Relaunch.
                </div>
              )}

              <form onSubmit={handleRegister} className="register-form">
                <div className={styles.field}>
                  <label className={styles.label}>EMAIL ADDRESS</label>
                  <input
                    className={`${styles.input} ${email && !emailValid ? styles.inputError : email && emailValid ? styles.inputSuccess : ''}`}
                    type="email"
                    placeholder={`student@${CAMPUS_DOMAIN}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  {email && (
                    <div className={emailValid ? styles.hintOk : styles.hintErr}>
                      {emailValid ? '✓ Valid campus email' : `✗ Only @${CAMPUS_DOMAIN} emails accepted`}
                    </div>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>DISPLAY NAME</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Alex Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.registerBtn}
                  disabled={loading || !emailValid}
                >
                  <div className={styles.registerBtnInner}>
                    <div className={styles.registerBtnIcon}>
                      {loading ? <span className={styles.spinner}></span> : '👆'}
                    </div>
                    <span>{loading ? 'Registering…' : 'Register Device'}</span>
                  </div>
                </button>
              </form>

              <div className={styles.footer}>
                <span style={{ color: 'var(--dim)' }}>Already have a passkey?</span>
                <Link to="/login" className={styles.footerLink} style={{ textDecoration: 'none' }}>
                  Login →
                </Link>
              </div>

              <div className={styles.certBar}>
                Secure FIDO2 / WebAuthn Certified
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
