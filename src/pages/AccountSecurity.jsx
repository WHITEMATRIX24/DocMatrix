import React, { useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { logout, getCurrentUser } from '@/services/authService';

export default function AccountSecurity() {
  const [password, setPassword] = useState(''), [code, setCode] = useState('');
  const [setup, setSetup] = useState(null), [recovery, setRecovery] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const run = async work => { setBusy(true); setMessage(''); try { await work(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  return <main style={{ maxWidth: 560, margin: '48px auto', padding: 24 }}>
    <h1>Secure your account</h1><p>Verify your email and enable an authenticator before accessing clinic records with an administrator account.</p>
    <button disabled={busy} onClick={() => run(async () => { const result = await apiClient.post('/auth/email/request'); setMessage(result.message || 'Check your email.'); })}>Send verification email</button>
    {getCurrentUser()?.mfaEnabled && <p>Authenticator verification is enabled.</p>}
    {!recovery && !getCurrentUser()?.mfaEnabled && <form onSubmit={event => { event.preventDefault(); run(async () => {
      if (!setup) { setSetup(await apiClient.post('/auth/mfa/setup', { password })); setPassword(''); }
      else { const result = await apiClient.post('/auth/mfa/confirm', { code }); setRecovery(result.recoveryCodes); setCode(''); }
    }); }}>
      <h2>Authenticator setup</h2>
      {!setup ? <label>Current password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label> : <>
        <p>Add this setup key to your authenticator app, using a time-based code:</p><code style={{ overflowWrap: 'anywhere' }}>{setup.secret}</code>
        <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required value={code} onChange={e => setCode(e.target.value)} /></label></>}
      <button disabled={busy} type="submit">{setup ? 'Confirm authenticator' : 'Create setup key'}</button>
    </form>}
    {recovery && <section><h2>Save your recovery codes</h2><p>Keep these codes in a password manager or another secure location. Each works once.</p><pre>{recovery.join('\n')}</pre><p>Two-step verification is enabled. Sign in again to continue.</p></section>}
    {message && <p role="status">{message}</p>}
    <button disabled={busy} onClick={() => run(async () => { await logout(); window.location.assign('/login'); })}>Sign out</button>
  </main>;
}
