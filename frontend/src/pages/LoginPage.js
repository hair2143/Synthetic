import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, continueAsGuest } = useApp();
  
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    const result = login(loginEmail, loginPassword, rememberMe);
    if (result.success) {
      if (result.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/marketplace');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!regName || !regEmail || !regPassword || !regConfirm) {
      setError('Please fill in all fields');
      return;
    }
    
    if (regPassword !== regConfirm) {
      setError('Passwords do not match');
      return;
    }
    
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    const result = register(regName, regEmail, regPassword);
    if (result.success) {
      navigate('/marketplace');
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate('/marketplace');
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#020818',
    border: '1px solid #1e293b',
    borderRadius: 12,
    fontSize: 14,
    color: '#e2e8f0',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020818',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex'
    }}>
      {/* Left Panel - Login/Register Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 60px',
        maxWidth: 520
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 24,
            color: '#fff'
          }}>T</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>Synthetix Market</div>
            <div style={{ fontSize: 12, color: '#475569' }}>AI-Powered Review Intelligence</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 14,
          padding: 4,
          marginBottom: 28
        }}>
          {['login', 'register'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(''); }}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 10,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
                background: activeTab === tab ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'transparent',
                color: activeTab === tab ? '#fff' : '#64748b',
                transition: 'all 0.2s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: '#f43f5e15',
            border: '1px solid #f43f5e40',
            borderRadius: 10,
            marginBottom: 20,
            fontSize: 13,
            color: '#f43f5e'
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#6366f1' }}
              />
              <label htmlFor="remember" style={{ fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                Remember me
              </label>
            </div>
            <button type="submit" style={{
              ...buttonStyle
            }}>
              Sign In
            </button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                Full Name
              </label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="John Doe"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                Email Address
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                Password
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={regConfirm}
                onChange={e => setRegConfirm(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <button type="submit" style={{
              ...buttonStyle
            }}>
              Create Account
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          margin: '24px 0'
        }}>
          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
          <span style={{ fontSize: 12, color: '#475569' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
        </div>

        {/* Guest Button */}
        <button
          onClick={handleGuest}
          style={{
            ...buttonStyle,
            background: 'transparent',
            border: '1px solid #1e293b',
            color: '#64748b'
          }}
        >
          Continue as Guest →
        </button>

        {/* Admin hint */}
        <p style={{ fontSize: 11, color: '#334155', marginTop: 20, textAlign: 'center' }}>
          Admin access: admin@synthetix.com / admin123
        </p>
      </div>

      {/* Right Panel - Hero */}
      <div style={{
        flex: 1.2,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 500, textAlign: 'center' }}>
          {/* Tagline */}
          <h1 style={{
            fontSize: 44,
            fontWeight: 800,
            color: '#e2e8f0',
            lineHeight: 1.2,
            marginBottom: 16
          }}>
            Buy Smart.<br />
            <span style={{ color: '#818cf8' }}>Sell Smart.</span>
          </h1>
          <p style={{
            fontSize: 18,
            color: '#94a3b8',
            marginBottom: 48
          }}>
            Every review certified. Every insight validated.
          </p>

          {/* Feature highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left' }}>
            {[
              { icon: '✅', title: 'AI-powered review insights', desc: 'Deep sentiment analysis on every product' },
              { icon: '🔒', title: 'Verified purchase trust scores', desc: 'Know which reviews you can trust' },
              { icon: '📊', title: 'Sentiment analysis on every product', desc: 'See what buyers really think' }
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                background: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 16,
                padding: '20px 24px'
              }}>
                <div style={{ fontSize: 28 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            marginTop: 48
          }}>
            {[
              { value: '1M+', label: 'Reviews Analyzed' },
              { value: '40K+', label: 'Products Listed' },
              { value: '99.2%', label: 'Accuracy Rate' }
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#818cf8' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
