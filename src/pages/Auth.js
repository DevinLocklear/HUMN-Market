// Auth.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleDiscord() {
    await supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: `${window.location.origin}/dashboard` } });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else navigate('/dashboard');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message); else setMessage('Check your email to confirm your account.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* Left panel */}
      <div style={{ flex: 1, background: 'var(--accent)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 280, height: 280, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 56, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
            HUMN Market
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>The Pokemon TCG marketplace with lower fees.</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 48 }}>Just 5% seller fees. Secure Stripe payments. Verified sellers.</p>
          {[['💸', 'Only 5% seller fees — vs 10%+ elsewhere'], ['🔒', 'Stripe-secured payments, buyer protection'], ['📦', 'Cards, sealed products, and graded slabs']].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{ width: 480, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', borderLeft: '1px solid var(--border)' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{mode === 'login' ? 'Sign in to your account' : 'Start buying and selling Pokemon cards'}</p>

          <button onClick={handleDiscord} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '11px', background: '#5865F2', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 10, fontFamily: 'inherit', marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.103.132 18.118a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Continue with Discord
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label className="field-label">Email</label><input className="field-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="field"><label className="field-label">Password</label><input className="field-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            {error && <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--red)', padding: '10px 14px', borderRadius: 9, fontSize: 13 }}>{error}</div>}
            {message && <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-mid)', color: 'var(--accent)', padding: '10px 14px', borderRadius: 9, fontSize: 13 }}>{message}</div>}
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '11px', marginTop: 4 }}>{loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
            {mode === 'login' ? <span>No account? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign up free</button></span>
              : <span>Have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Sign in</button></span>}
          </div>
        </div>
      </div>
    </div>
  );
}
