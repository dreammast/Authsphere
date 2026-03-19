import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import api from './api';

export async function registerFido2(email: string, name?: string): Promise<void> {
  const beginRes = await api.post('/api/auth/register/begin', { email, name });
  const options  = beginRes.data.data.options;

  let response;
  try {
    // v9.0.1 takes options directly
    response = await startRegistration(options);
  } catch (err: any) {
    if (err.name === 'InvalidStateError') {
      throw new Error('This device is already registered for your account.');
    }
    if (err.name === 'NotAllowedError') {
      throw new Error('Registration was cancelled. Please try again.');
    }
    throw new Error(`Registration failed: ${err.message}`);
  }

  await api.post('/api/auth/register/complete', { email, response });
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id:           string;
    email:        string;
    name:         string;
    role:         string;
    studentId?:   string;
    dept?:        string;
  };
}

export async function loginFido2(
  email:   string,
  userId:  string,
  options: any,
): Promise<LoginResult> {
  let response;
  try {
    // v9.0.1 takes options directly
    response = await startAuthentication(options);
  } catch (err: any) {
    // Map browser error names to human-readable messages as per audit requirements
    const errorMap: Record<string, string> = {
      NotAllowedError:    'Authentication was cancelled or timed out.',
      InvalidStateError:  'This credential is not valid on this device.',
      NotSupportedError:  'Your browser does not support WebAuthn.',
      SecurityError:      'Security error — ensure you are on HTTPS or localhost.',
      UnknownError:       'An unknown authenticator error occurred.',
    };
    
    const message = errorMap[err.name] ?? `Authenticator error: ${err.message}`;
    const mappedErr = new Error(message);
    (mappedErr as any).name = err.name; // preserve name for flow control
    throw mappedErr;
  }

  const res = await api.post('/api/auth/login/complete', { userId, response });
  return res.data.data as LoginResult;
}
