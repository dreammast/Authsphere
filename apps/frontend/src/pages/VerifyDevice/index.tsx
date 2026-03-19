import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerFido2 } from '../../lib/webauthn';
import { useAuthStore } from '../../context/authStore';
import { showToast } from '../../hooks/useJWT';

export default function VerifyDevicePage() {
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleRegister = async () => {
        if (!user?.email) {
            showToast('error', 'Session expired', 'Please log in again');
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            await registerFido2(user.email, user.display_name);
            setSuccess(true);
            showToast('success', 'Device registered!', 'Next login will use biometrics');
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err: any) {
            showToast('error', 'Registration failed', err.message || 'Try again');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Passkey Registered!</h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Redirecting to dashboard…</p>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <div style={{ width: '100%', maxWidth: 480, padding: 24 }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                        }}>🔐</div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1, color: '#fff' }}>AuthSphere</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, fontWeight: 700 }}>VELTECH CAMPUS SSO</div>
                        </div>
                    </div>
                </div>

                <div style={cardStyle}>
                    {/* Icon */}
                    <div style={{
                        width: 72, height: 72, borderRadius: 20, margin: '0 auto 24px',
                        background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
                        border: '1px solid rgba(0,212,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36
                    }}>
                        👆
                    </div>

                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
                        Secure Your Account
                    </h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28, textAlign: 'center', lineHeight: 1.6 }}>
                        Register a passkey on this device for <span style={{ color: '#00d4ff' }}>faster, passwordless logins</span>.
                        Next time you sign in, just use your fingerprint or PIN — no OTP needed.
                    </p>

                    {/* Benefits */}
                    <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: 16, marginBottom: 28,
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        {[
                            ['⚡', 'Instant login', 'No waiting for email OTPs'],
                            ['🛡️', 'Phishing-proof', 'Bound to this device & origin'],
                            ['🔒', 'Private', 'Biometrics never leave your device'],
                        ].map(([icon, title, desc]) => (
                            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0' }}>
                                <span style={{ fontSize: 18 }}>{icon}</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Register Button */}
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: '#fff',
                            fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginBottom: 16,
                        }}
                    >
                        {loading ? 'Registering…' : '👆 Register Passkey Now'}
                    </button>

                    {/* Skip */}
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            width: '100%', background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer',
                            padding: 8, fontWeight: 500,
                        }}
                    >
                        Skip for now →
                    </button>
                </div>
            </div>
        </div>
    );
}

const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 60%)',
};

const cardStyle: React.CSSProperties = {
    background: 'rgba(11,22,40,0.8)',
    padding: 36,
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
};
