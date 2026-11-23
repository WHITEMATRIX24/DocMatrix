import React, { useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { logout } from '@/services/authService';
export default function VerifyEmail() {
  const [token] = useState(() => { const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || new URLSearchParams(window.location.search).get('token'); window.history.replaceState(null, '', '/verify-email'); return value; });
  const [message, setMessage] = useState('Confirm to verify your email address.'), [busy, setBusy] = useState(false);
  return <main style={{ maxWidth: 520, margin: '48px auto', padding: 24 }}><h1>Verify email</h1><p role="status">{message}</p>
    <button disabled={busy || !token} onClick={async () => { setBusy(true); try { const result = await apiClient.post('/auth/email/verify', { token }); await logout(); setMessage(result.message); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}>Verify email address</button><p><a href="/login">Sign in</a></p></main>;
}
