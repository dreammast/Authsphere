import React, { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../../lib/api';
import { showToast } from '../../hooks/useJWT';
import { Button } from '../ui/Button';

type AuthOption = 'biometric' | 'pin' | 'security_key' | 'phone';
type TileState = 'idle' | 'active' | 'scanning' | 'success' | 'failed' | 'cancelled' | 'unavailable';

interface WindowsAuthenticatorProps {
  email: string;
  userId: string;
  fidoOptions: any;
  onSuccess: (result: any) => void;
  onCancel: () => void;
  onSwitchToOtp: () => void;
}

const STATUS_MESSAGES = {
  initial:                 'Choose how you want to sign in',
  biometric_scanning:      'Waiting for biometric verification...',
  biometric_success:       '✓ Identity verified',
  biometric_failed:        'Biometric not recognised. Try PIN instead.',
  biometric_cancelled:     'Verification cancelled. Choose another option.',
  biometric_unavailable:   'No biometric sensor detected on this device.',
  pin_prompt:              'Enter your device PIN to continue',
  pin_success:             '✓ PIN verified',
  pin_failed:              'Incorrect PIN. Please try again.',
  security_key_waiting:    'Insert or tap your security key...',
  security_key_not_found:  'Security key not detected. Please insert your key.',
  security_key_success:    '✓ Security key verified',
  phone_qr_shown:          'Scan the QR code with your phone to authenticate',
  phone_success:           '✓ Phone authentication successful',
  error_no_webauthn:       'This browser does not support passwordless sign-in.',
  error_wrong_device:      'This credential is registered to a different device.',
  error_security:          'Security error. Please ensure you are on a trusted network.',
  redirecting:             'Signing you in...',
};

const ScanningRing = () => (
  <div style={{
    position: 'absolute',
    inset: -10,
    border: '2px solid var(--accent)',
    borderRadius: '50%',
    borderTopColor: 'transparent',
    animation: 'spin 1s linear infinite'
  }} />
);

const SuccessOverlay = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'rgba(16,185,129,0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: '#10b981'
  }}>✓</div>
);

const FailedOverlay = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'rgba(239,68,68,0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: '#ef4444'
  }}>✕</div>
);

export const WindowsAuthenticator: React.FC<WindowsAuthenticatorProps> = ({
  email,
  userId,
  fidoOptions,
  onSuccess,
  onCancel,
  onSwitchToOtp
}) => {
  const [selectedOption, setSelectedOption] = useState<AuthOption | null>(null);
  const [tileStates, setTileStates] = useState<Record<AuthOption, TileState>>({
    biometric: 'idle',
    pin: 'idle',
    security_key: 'idle',
    phone: 'idle'
  });
  const [statusMessage, setStatusMessage] = useState(STATUS_MESSAGES.initial);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState(email.split('@')[0]);

  useEffect(() => {
    async function detectCapabilities() {
      // Check for hardware/browser support
      const isSecure = window.isSecureContext;
      
      if (!isSecure && window.location.hostname !== 'localhost') {
        setAllTilesUnavailable('Secure context (HTTPS) required for biometrics');
        return;
      }

      if (!(window as any).PublicKeyCredential) {
        setAllTilesUnavailable('WebAuthn not supported in this browser');
        return;
      }

      const hasPlatformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      setTileState('biometric', hasPlatformAuth ? 'idle' : 'unavailable');
      setTileState('pin',       hasPlatformAuth ? 'idle' : 'unavailable');
      setTileState('security_key', 'idle');
      setTileState('phone',        'idle');

      if (hasPlatformAuth) {
        setStatusMessage(STATUS_MESSAGES.initial);
      } else {
        setStatusMessage('Use a security key or your phone to sign in');
      }
    }
    detectCapabilities();
  }, []);

  const setTileState = (option: AuthOption, state: TileState) => {
    setTileStates(prev => ({ ...prev, [option]: state }));
  };

  const setAllTilesUnavailable = (msg: string) => {
    setTileStates({
      biometric: 'unavailable',
      pin: 'unavailable',
      security_key: 'unavailable',
      phone: 'unavailable'
    });
    setStatusMessage(msg);
    setStatusType('error');
  };

  const handleWebAuthnError = (err: any, option: AuthOption) => {
    const errorMessages: Record<string, { message: string; type: 'error'|'warning' }> = {
      NotAllowedError:   { message: 'Verification was cancelled or timed out.', type: 'warning' },
      InvalidStateError: { message: 'This credential is not registered on this device.', type: 'error' },
      NotSupportedError: { message: 'Your browser does not support this authentication method.', type: 'error' },
      SecurityError:     { message: 'Security error — check you are on the correct site.', type: 'error' },
      AbortError:        { message: 'Authentication was aborted. Please try again.', type: 'warning' },
    };
    
    const mapped = errorMessages[err.name] ?? { message: err.message, type: 'error' };
    setStatusMessage(mapped.message);
    setStatusType(mapped.type);
    setTileState(option, mapped.type === 'error' ? 'failed' : 'cancelled');
    showToast(mapped.type, mapped.message);
    setIsProcessing(false);
  };

  const startAuth = async (option: AuthOption) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSelectedOption(option);
    setTileState(option, 'scanning');
    
    const scanMessage = option === 'biometric' ? STATUS_MESSAGES.biometric_scanning :
                        option === 'pin' ? STATUS_MESSAGES.pin_prompt :
                        option === 'security_key' ? STATUS_MESSAGES.security_key_waiting :
                        STATUS_MESSAGES.phone_qr_shown;
    setStatusMessage(scanMessage);
    setStatusType('info');

    try {
      // For Biometric/PIN, we use the same WebAuthn 'discoverable credential' or 'uv' flow
      const response = await startAuthentication(fidoOptions);
      
      const verifyRes = await api.post('/api/auth/login/complete', {
        email,
        userId,
        response
      });

      setTileState(option, 'success');
      setStatusMessage(option === 'biometric' ? STATUS_MESSAGES.biometric_success : 
                       option === 'pin' ? STATUS_MESSAGES.pin_success : 
                       STATUS_MESSAGES.security_key_success);
      setStatusType('success');
      
      setTimeout(() => {
        onSuccess(verifyRes.data.data);
      }, 1000);

    } catch (err: any) {
      handleWebAuthnError(err, option);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTileClick = (option: AuthOption) => {
    if (tileStates[option] === 'unavailable' || isProcessing) return;

    if (option === 'pin') {
      setShowPinEntry(true);
    } else {
      startAuth(option);
    }
  };

  const handlePinSubmit = () => {
    setShowPinEntry(false);
    startAuth('pin');
  };

  const maskEmail = (e: string) => {
    const [user, domain] = e.split('@');
    return `${user.substring(0, 4)}****@${domain}`;
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 400 }}>
      {/* User Info Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: '50%', background: 'var(--surface)', 
          margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, border: '1px solid var(--border)'
        }}>👤</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{userDisplayName}</h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{maskEmail(email)}</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Sign in to AuthSphere</h3>
      </div>

      {/* Tiles Container */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 40 }}>
        <AuthTile 
          option="biometric" icon="🔐" label="Biometric" sublabel="Fingerprint / Face"
          state={tileStates.biometric} onClick={() => handleTileClick('biometric')}
        />
        <AuthTile 
          option="pin" icon="🔢" label="PIN" sublabel="Enter device PIN"
          state={tileStates.pin} onClick={() => handleTileClick('pin')}
        />
        <AuthTile 
          option="security_key" icon="🔑" label="Security Key" sublabel="USB / NFC Key"
          state={tileStates.security_key} onClick={() => handleTileClick('security_key')}
        />
      </div>

      {/* Status Message */}
      <div style={{ 
        textAlign: 'center', padding: '12px 20px', borderRadius: 12,
        background: statusType === 'error' ? 'rgba(239,68,68,0.1)' : 
                    statusType === 'success' ? 'rgba(16,185,129,0.1)' : 'transparent',
        border: statusType !== 'info' ? `1px solid ${statusType === 'error' ? '#ef4444' : '#10b981'}` : 'none'
      }}>
        <p style={{ 
          fontSize: 14, margin: 0, 
          color: statusType === 'error' ? '#ef4444' : 
                 statusType === 'success' ? '#10b981' : 'var(--muted)' 
        }}>
          {statusMessage}
        </p>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <button 
          onClick={onSwitchToOtp}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }}
        >
          Sign in another way ↓
        </button>
      </div>

      {/* PIN Entry Overlay */}
      {showPinEntry && (
        <div style={{ 
          position: 'absolute', inset: -20, background: 'var(--card)', zIndex: 100,
          borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔢</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Enter your device PIN</h3>
          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 32 }}>
            This is your Windows/macOS/device PIN — it never leaves your device and is verified locally.
          </p>
          
          <input 
            type="password" autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            style={{ 
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', 
              borderRadius: 12, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 8,
              color: '#fff', outline: 'none'
            }}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 32, width: '100%' }}>
            <Button fullWidth onClick={handlePinSubmit}>Verify PIN</Button>
            <Button fullWidth variant="secondary" onClick={() => setShowPinEntry(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AuthTile: React.FC<{
  option: AuthOption;
  state: TileState;
  onClick: () => void;
  icon: string;
  label: string;
  sublabel: string;
}> = ({ state, onClick, icon, label, sublabel }) => {
  const tileStyle: Record<TileState, React.CSSProperties> = {
    idle:        { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' },
    active:      { border: '1px solid #00d4ff', background: 'rgba(0,212,255,0.05)', cursor: 'pointer' },
    scanning:    { border: '1px solid #00d4ff', background: 'rgba(0,212,255,0.08)', cursor: 'wait' },
    success:     { border: '1px solid #10b981', background: 'rgba(16,185,129,0.08)', cursor: 'default' },
    failed:      { border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', cursor: 'pointer' },
    cancelled:   { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' },
    unavailable: { border: '1px solid rgba(255,255,255,0.05)', background: 'transparent', cursor: 'not-allowed', opacity: 0.5 },
  };

  return (
    <div 
      onClick={onClick}
      style={{ 
        width: 120, padding: 20, borderRadius: 16, textAlign: 'center', transition: 'all 0.2s',
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
        ...tileStyle[state]
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12, position: 'relative' }}>
        {state === 'scanning' && <ScanningRing />}
        {state === 'success' && <SuccessOverlay />}
        {state === 'failed' && <FailedOverlay />}
        <span>{icon}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
        {state === 'unavailable' ? 'Not available' : sublabel}
      </div>
    </div>
  );
};
