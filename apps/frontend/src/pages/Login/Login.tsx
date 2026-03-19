import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { loginFido2 } from '../../lib/webauthn';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../../components/ui/Button';
import { showToast } from '../../hooks/useJWT';
import { WindowsAuthenticator } from '../../components/auth/WindowsAuthenticator';

// ── TYPES ────────────────────────────────────────────────────────────────────
type AuthStep = 'EMAIL' | 'BIOMETRIC' | 'OTP' | 'CANCELLED' | 'REGISTER';

const CAMPUS_DOMAIN = import.meta.env.VITE_CAMPUS_DOMAIN ?? 'veltech.edu.in';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, token } = useAuthStore();

  // ── STATE ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<AuthStep>('EMAIL');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [fidoOpts, setFidoOpts] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // OTP State
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpTimer, setOtpTimer] = useState(180);
  const [maskedEmail, setMaskedEmail] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── EFFECTS ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      const { user } = useAuthStore.getState();
      navigate('/dashboard');
    }
  }, [token, navigate]);

  useEffect(() => {
    let id: any;
    if (step === 'OTP' && otpTimer > 0) {
      id = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(id);
  }, [step, otpTimer]);

  // ── HANDLERS ───────────────────────────────────────────────────────────────

  const handleIdentify = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      showToast('error', `Only @${CAMPUS_DOMAIN} emails permitted`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login/begin', { email: cleanEmail });
      const { userId: uid, options, requireOTP } = res.data.data;

      setUserId(uid);
      if (requireOTP || !options) {
        await handleSendOTP(cleanEmail);
      } else {
        setFidoOpts(options);
        setStep('BIOMETRIC');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Identification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: string = email.trim().toLowerCase()) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/otp/send', { email: e });
      setMaskedEmail(res.data.maskedEmail);
      setOtpTimer(180);
      setStep('OTP');
      showToast('info', 'OTP Sent', `Code delivered to ${res.data.maskedEmail}`);
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) return;

    setLoading(true);
    try {
      const res = await api.post('/api/auth/otp/verify', { email: email.trim().toLowerCase(), otp: code });
      const { accessToken, user, hasCredentials } = res.data.data;
      setAuth(accessToken, user, Math.floor(Date.now() / 1000) + 3600, 'OTP');
      showToast('success', 'Verified', 'Login successful');
      navigate(hasCredentials === false ? '/verify-device' : '/dashboard');
    } catch (err: any) {
      showToast('error', err.response?.data?.error ?? 'Invalid OTP');
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (newOtp.every(v => v !== '')) {
      setTimeout(handleVerifyOTP, 100);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,212,255,0.06) 0%,transparent 60%)'
    }}>

      <div style={{ width: '100%', maxWidth: 440, padding: 24 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
            }}>🔐</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1, color: '#fff' }}>AuthSphere</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, fontWeight: 700 }}>VELTECH CAMPUS SSO</div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(11,22,40,0.8)', padding: 36, borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)', WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)'
        }}>

          {/* ── STEP: EMAIL ─────────────────────────────────── */}
          {step === 'EMAIL' && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Welcome</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Enter your campus email to continue.</p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>UNIVERSITY EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                  placeholder={`vtu12345@${CAMPUS_DOMAIN}`}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                    padding: 16, fontSize: 15, color: '#fff', outline: 'none', transition: 'all 0.2s'
                  }}
                />
              </div>

              <Button fullWidth size="lg" loading={loading} onClick={handleIdentify}>
                Continue
              </Button>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <a href="/register" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
                  Register New Device →
                </a>
              </div>
            </>
          )}

          {/* ── STEP: AUTHENTICATOR ─────────────────────────── */}
          {(step === 'BIOMETRIC' || step === 'CANCELLED') && (
            <WindowsAuthenticator
              email={email}
              userId={userId}
              fidoOptions={fidoOpts}
              onSuccess={(result) => {
                showToast('success', 'Device verified ✓', 'Now verify your identity via email OTP');
                handleSendOTP();
              }}
              onCancel={() => setStep('CANCELLED')}
              onSwitchToOtp={() => handleSendOTP()}
            />
          )}

          {/* ── STEP: OTP ────────────────────────────────────── */}
          {step === 'OTP' && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Check Email</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
                We sent a 6-digit code to <span style={{ color: '#00d4ff' }}>{maskedEmail}</span>
              </p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                {otp.map((digit, i) => (
                  <input key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text" maxLength={1} value={digit}
                    onChange={e => handleOtpInput(e.target.value, i)}
                    onKeyDown={e => e.key === 'Backspace' && !digit && i > 0 && otpRefs.current[i - 1]?.focus()}
                    style={{
                      width: 48, height: 56, borderRadius: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                      textAlign: 'center', fontSize: 24, fontWeight: 800, color: '#00d4ff', outline: 'none'
                    }}
                  />
                ))}
              </div>

              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>
                    EXPIRES IN {formatTime(otpTimer)}
                  </span>
                </div>
              </div>

              <Button fullWidth size="lg" loading={loading} disabled={otp.join('').length < 6} onClick={handleVerifyOTP}>
                Verify & Sign In
              </Button>

              <button
                disabled={otpTimer > 120}
                onClick={() => handleSendOTP()}
                style={{
                  width: '100%', background: 'none', border: 'none', color: otpTimer > 120 ? 'rgba(255,255,255,0.2)' : '#7c3aed',
                  fontSize: 13, marginTop: 24, cursor: otpTimer > 120 ? 'not-allowed' : 'pointer', fontWeight: 600
                }}>
                {otpTimer > 120 ? `Resend code in ${otpTimer - 120}s` : 'Resend OTP now'}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
