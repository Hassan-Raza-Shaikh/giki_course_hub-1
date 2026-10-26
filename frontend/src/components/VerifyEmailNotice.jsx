import React, { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Alert, Button } from './ui';

/**
 * Shown to email/password users whose address isn't verified yet. A verified
 * email is needed to link an older account and to use admin tools.
 */
const VerifyEmailNotice = () => {
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const fbUser = auth.currentUser;
  const usesPassword = fbUser?.providerData?.some(p => p.providerId === 'password');
  if (!fbUser || fbUser.emailVerified || !usesPassword) return null;

  const resend = async () => {
    setState('sending');
    try {
      await sendEmailVerification(fbUser);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <Alert tone={state === 'error' ? 'danger' : 'warning'} style={{ marginBottom: '24px' }}>
      {state === 'sent' ? (
        <>Verification link sent to <strong>{fbUser.email}</strong>. Open it, then sign in again.</>
      ) : state === 'error' ? (
        <>Couldn't send the link right now. Wait a few minutes and try again.</>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: '200px' }}>Your email <strong>{fbUser.email}</strong> isn't verified yet.</span>
          <Button size="sm" variant="warning" onClick={resend} disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send verification link'}
          </Button>
        </div>
      )}
    </Alert>
  );
};

export default VerifyEmailNotice;
