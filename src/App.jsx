import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ShoppingBag, LayoutDashboard, Clock, UserCheck, Sun, Moon, LogOut } from 'lucide-react';
import POS from './pages/POS';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { api } from './services/api';

// Protected Route wrapper component
function ProtectedRoute({ user, roleRequired, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roleRequired && user.role !== roleRequired) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Layout component to share header/nav across pages
function MainLayout({ children, user, onLogout }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pos_theme') || 'light';
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('pos_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="layout-container">
      {/* Premium Floating Header */}
      <header className="glass-panel layout-header">
        <div className="brand-container">
          <div className="logo-badge">
            <ShoppingBag size={20} color="white" />
          </div>
          <div>
            <h1 className="brand-title">AuraPos</h1>
            <span className="brand-subtitle">
              <span className="pulse-dot"></span>
              System Connected
            </span>
          </div>
        </div>

        <nav className="header-nav">
          <Link
            to="/"
            className={`header-nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <ShoppingBag size={18} />
            <span>POS Register</span>
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`header-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Management Console</span>
            </Link>
          )}
        </nav>

        <div className="header-right">
          {/* Live System Clock */}
          <div className="clock-container">
            <Clock size={15} className="clock-icon" color="var(--text-muted)" />
            <div className="clock-text">
              <div className="clock-time">{formatTime(time)}</div>
              <div className="clock-date">{formatDate(time)}</div>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="theme-toggle-btn"
          >
            {theme === 'light' ? <Moon size={16} color="var(--accent-primary)" /> : <Sun size={16} color="var(--warning)" />}
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Logout Register Session"
            className="logout-btn"
          >
            <LogOut size={16} color="var(--danger)" />
          </button>

          {/* Cashier Badge */}
          <div className="cashier-badge">
            <div className="cashier-avatar">
              <UserCheck size={14} color="var(--accent-primary)" />
            </div>
            <div className="cashier-info">
              <span className="cashier-label">{user?.role === 'admin' ? 'System Admin' : 'Active Cashier'}</span>
              <span className="cashier-name">{user?.name || 'Cashier'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to load credentials:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontFamily: 'sans-serif'
      }}>
        Initializing secure session...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Login Page Route */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
          }
        />

        {/* POS Page protected Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={user}>
              <MainLayout user={user} onLogout={handleLogout}>
                <POS />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin page protected route (admin access only) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} roleRequired="admin">
              <MainLayout user={user} onLogout={handleLogout}>
                <Admin />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Inline Styles for Core Layout Shell
const styles = {
  layoutContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '16px 24px 0 24px',
    padding: '12px 24px',
    borderRadius: '16px',
    zIndex: 100,
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    background: 'var(--gradient-accent)',
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px var(--accent-glow)',
  },
  brandTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
  },
  brandSubtitle: {
    fontSize: '11px',
    color: 'var(--success)',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    background: 'var(--success)',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '6px',
    boxShadow: '0 0 0 rgba(76, 175, 80, 0.4)',
    animation: 'pulse 2s infinite',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--bg-overlay)',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  clockContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingRight: '16px',
    borderRight: '1px solid var(--glass-border)',
  },
  clockIcon: {
    color: 'var(--text-muted)',
  },
  clockText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  clockTime: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
  },
  clockDate: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  themeToggleBtn: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    outline: 'none',
  },
  logoutBtn: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    outline: 'none',
  },
  cashierBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cashierAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--glass-bg)',
    border: '1px solid var(--border-focus)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  cashierLabel: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  cashierName: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
  }
};

export default App;
