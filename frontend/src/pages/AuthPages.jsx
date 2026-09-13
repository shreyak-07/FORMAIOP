import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, register, forgotPassword, resetPassword } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { messageFromError } from '../services/api';
import { Card } from '../components/UI';

function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Link to="/" className="brand">FORMA <b>AI</b></Link>
        <div className="auth-pitch">
          <span className="eyebrow">AI-AUGMENTED FORMS</span>
          <h1>Complex forms, made conversational.</h1>
          <p>Turn natural language into structured, reviewable information with a dynamic form engine built for real workflows.</p>
          <div className="pitch-points">
            <span>✦ Schema-controlled AI</span>
            <span>✓ Human review before submission</span>
            <span>↗ Save and resume anywhere</span>
          </div>
        </div>
      </div>
      <div className="auth-main">
        <Card className="auth-card">
          <span className="eyebrow">WELCOME TO FORMA AI</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          {children}
        </Card>
      </div>
    </div>
  );
}

export function SignIn() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      setAuth(await login({ email, password, remember }));
      nav('/dashboard');
    } catch (x) {
      setErr(messageFromError(x));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your intelligent forms.">
      <form onSubmit={submit} className="auth-form">
        <label className="input-wrap">
          <span>Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="input-wrap">
          <span>Password</span>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <div className="inline-row">
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        {err && <div className="status error">{err}</div>}
        <button type="submit" disabled={loading} className="btn">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <div className="auth-switch">New to Forma AI? <Link to="/signup">Create an account</Link></div>
      </form>
    </AuthLayout>
  );
}

export function SignUp() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);

  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    if (!terms) {
      return setErr('Please accept the terms to continue.');
    }

    if (password !== confirmPassword) {
      return setErr('Passwords do not match.');
    }

    setLoading(true);
    setErr('');

    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password: password
      });
      setAuth(res);
      nav('/dashboard');
    } catch (x) {
      setErr(x?.response?.data?.message || messageFromError(x));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start turning complex forms into simple conversations.">
      <form onSubmit={submit} className="auth-form">
        <label className="input-wrap">
          <span>Full name</span>
          <input required type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="input-wrap">
          <span>Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="input-wrap">
          <span>Password</span>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="input-wrap">
          <span>Confirm password</span>
          <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </label>

        <label className="check" style={{ marginTop: '12px' }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I agree to the terms and privacy policy.
        </label>
        {err && <div className="status error">{err}</div>}
        <button type="submit" disabled={loading} className="btn">
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <div className="auth-switch">Already have an account? <Link to="/signin">Sign in</Link></div>
      </form>
    </AuthLayout>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (x) {
      setErr(messageFromError(x));
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll create reset instructions if the account exists.">
      <form onSubmit={submit} className="auth-form">
        <label className="input-wrap">
          <span>Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {done ? (
          <div className="status success">Check your email for reset instructions.</div>
        ) : (
          <button type="submit" className="btn">Send reset instructions</button>
        )}
        {err && <div className="status error">{err}</div>}
        <div className="auth-switch"><Link to="/signin">← Back to sign in</Link></div>
      </form>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const token = new URLSearchParams(useLocation().search).get('token') || '';
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (p !== c) return setErr('Passwords do not match');
    try {
      await resetPassword(token, p);
      setMsg('Password reset successfully.');
      setTimeout(() => nav('/signin'), 800);
    } catch (x) {
      setErr(messageFromError(x));
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Use your secure reset token to update your password.">
      <form onSubmit={submit} className="auth-form">
        <label className="input-wrap">
          <span>New password</span>
          <input required type="password" value={p} onChange={(e) => setP(e.target.value)} />
        </label>
        <label className="input-wrap">
          <span>Confirm password</span>
          <input required type="password" value={c} onChange={(e) => setC(e.target.value)} />
        </label>
        {err && <div className="status error">{err}</div>}
        {msg && <div className="status success">{msg}</div>}
        <button type="submit" disabled={!token} className="btn">
          {token ? 'Reset password' : 'Missing reset token'}
        </button>
      </form>
    </AuthLayout>
  );
}