import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/services/apiClient'
export default function ResetPassword() {
  const [token] = useState(() => { const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || new URLSearchParams(window.location.search).get('token'); window.history.replaceState(null, '', '/reset-password'); return value; })
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async event => {
    event.preventDefault()
    if (password !== confirmation) { setMessage('Passwords do not match.'); return }
    if (new TextEncoder().encode(password).length > 72) { setMessage('Password must not exceed 72 UTF-8 bytes.'); return; }
    setBusy(true); setMessage('')
    try { const result = await apiClient.post('/auth/password-reset/complete', { token: token, password }); setMessage(result.message); setDone(true); setPassword(''); setConfirmation('') }
    catch (error) { setMessage(error.message || 'Password could not be updated.') }
    finally { setBusy(false) }
  }
  return <main className="auth-page"><section style={{ maxWidth: 460, margin: '64px auto', padding: 28 }}><h1>Set a new password</h1>
    {message && <p role={done ? 'status' : 'alert'}>{message}</p>}
    {!done && <form onSubmit={submit}><label>New password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label>Confirm password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      <button type="submit" disabled={busy || !/^[a-f0-9]{64}$/.test(token || '')}>{busy ? 'Saving…' : 'Save password'}</button></form>}
    <Link to="/login">Return to sign in</Link></section></main>
}
