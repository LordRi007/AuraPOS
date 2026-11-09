import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Lock, AlertCircle, KeyRound, LogIn } from 'lucide-react';
import { api } from '../services/api';
import '../styles/Login.css';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const authData = await api.login(username, password);
      onLoginSuccess(authData.user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('cashier');
      setPassword('cashier123');
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        {/* Header Logo & Title */}
        <div className="login-header">
          <div className="login-logo">
            <ShoppingBag size={24} color="white" />
          </div>
          <h2 className="login-title">AuraPos</h2>
          <span className="login-subtitle">Sign in to your register session</span>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} color="var(--danger)" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                disabled={loading}
                required
              />
              <User size={16} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                disabled={loading}
                required
              />
              <Lock size={16} className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn size={16} />
              </>
            )}
          </button>
        </form>

        {/* Preset accounts quick-login */}
        <div className="preset-section">
          <h3 className="preset-title">Quick Demo Login</h3>
          <div className="preset-pills">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="preset-pill"
              disabled={loading}
            >
              <KeyRound size={12} color="var(--accent-primary)" />
              <span>Admin Account</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('cashier')}
              className="preset-pill"
              disabled={loading}
            >
              <KeyRound size={12} color="var(--info)" />
              <span>Cashier Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
