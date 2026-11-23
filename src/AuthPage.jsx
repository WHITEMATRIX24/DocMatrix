import React from 'react'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
export default function AuthPage({ view = 'login', onLoginSuccess }) {
  return view === 'signup' ? <Signup onLoginSuccess={onLoginSuccess} /> : <Login onLoginSuccess={onLoginSuccess} />
}
