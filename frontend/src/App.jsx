import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Flame, ShieldAlert, CheckCircle, Sparkles, User, Lock, KeyRound, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AdminLogs from './components/AdminLogs';

// Robust React Error Boundary to prevent blank page and expose stack trace
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught a React crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-[#24283b] text-[#f7768e] min-h-screen flex flex-col justify-center items-center font-sans">
          <div className="w-full max-w-2xl p-8 rounded-3xl border border-[#f7768e]/20 bg-[#1f2335]/90 backdrop-blur-md shadow-2xl">
            <h1 className="text-3xl font-black mb-4 flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-[#f7768e]" />
              Application Error
            </h1>
            <p className="text-sm text-[#a9b1d6] mb-6">
              A runtime JavaScript exception crashed the React rendering tree.
            </p>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-[#bb9af7] mb-1">Error String</span>
                <pre className="bg-[#24283b] border border-white/5 p-4 rounded-xl overflow-auto text-sm font-mono text-[#c0caf5]">
                  {this.state.error && this.state.error.toString()}
                </pre>
              </div>
              {this.state.errorInfo && (
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#bb9af7] mb-1">Component Stack</span>
                  <pre className="bg-[#24283b] border border-white/5 p-4 rounded-xl overflow-auto text-xs font-mono text-[#565f89] max-h-60">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                window.location.reload();
              }} 
              className="mt-8 px-6 py-3 rounded-xl bg-[#7aa2f7] hover:bg-[#7aa2f7]/90 text-[#1f2335] font-extrabold transition-colors shadow-lg"
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewingLogs, setViewingLogs] = useState(false);

  // Configure axios base defaults
  useEffect(() => {
    // In local development, Vite proxies requests from /api to http://backend:8000
    axios.defaults.baseURL = '';
  }, []);

  // Fetch current user details if token exists
  const fetchCurrentUser = async (authToken) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(response.data);
    } catch (err) {
      // Token is invalid/expired
      handleLogout();
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setUser(null);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setViewingLogs(false);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });
      const newToken = response.data.access_token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      // Reset forms
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Register
      await axios.post('/api/auth/register', {
        username,
        name: name || username,
        password
      });
      
      // Auto Login
      const loginResponse = await axios.post('/api/auth/login', {
        username,
        password
      });
      
      const newToken = loginResponse.data.access_token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      // Reset forms
      setUsername('');
      setName('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Username might be taken.');
    } finally {
      setLoading(false);
    }
  };

  if (token && user) {
    if (viewingLogs && user.username === 'admin') {
      return (
        <ErrorBoundary>
          <div className="min-h-screen bg-tokyo-bg text-tokyo-text pb-12">
            <AdminLogs token={token} onBack={() => setViewingLogs(false)} />
          </div>
        </ErrorBoundary>
      );
    }
    
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-tokyo-bg text-tokyo-text pb-12">
          <Dashboard 
            user={user} 
            token={token} 
            onLogout={handleLogout} 
            onOpenLogs={() => setViewingLogs(true)} 
          />
        </div>
      </ErrorBoundary>
    );
  }

  // Auth Screen (Login / Register)
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-tokyo-bg text-tokyo-text flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Visual background accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-glow-purple -z-10 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-glow-blue -z-10 pointer-events-none" />

        {/* Main Card */}
        <div className="w-full max-w-md rounded-3xl border border-white/5 bg-tokyo-card/40 backdrop-blur-lg shadow-2xl p-8 transition-all duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-tokyo-purple to-tokyo-blue text-tokyo-bg shadow-xl mb-4">
              <Flame className="w-10 h-10 fill-tokyo-bg" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">75 HARD</h2>
            <p className="text-sm text-tokyo-muted mt-1">Mental Toughness Habit Tracker</p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-white/5 mb-6">
            <button 
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${!isRegistering ? 'border-tokyo-purple text-tokyo-purple' : 'border-transparent text-tokyo-muted hover:text-tokyo-secondary'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${isRegistering ? 'border-tokyo-purple text-tokyo-purple' : 'border-transparent text-tokyo-muted hover:text-tokyo-secondary'}`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-tokyo-red/10 border border-tokyo-red/20 text-tokyo-red text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Forms */}
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tokyo-secondary mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-tokyo-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ironmind"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-tokyo-bg/70 border border-white/5 focus:border-tokyo-purple focus:outline-none focus:ring-2 focus:ring-tokyo-purple/20 text-white placeholder-tokyo-muted text-sm font-medium transition-all"
                  required
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-tokyo-secondary mb-1.5">Display Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-tokyo-muted">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Carter"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-tokyo-bg/70 border border-white/5 focus:border-tokyo-purple focus:outline-none focus:ring-2 focus:ring-tokyo-purple/20 text-white placeholder-tokyo-muted text-sm font-medium transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-tokyo-secondary mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-tokyo-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-tokyo-bg/70 border border-white/5 focus:border-tokyo-purple focus:outline-none focus:ring-2 focus:ring-tokyo-purple/20 text-white placeholder-tokyo-muted text-sm font-medium transition-all"
                  required
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-tokyo-secondary mb-1.5">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-tokyo-muted">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-tokyo-bg/70 border border-white/5 focus:border-tokyo-purple focus:outline-none focus:ring-2 focus:ring-tokyo-purple/20 text-white placeholder-tokyo-muted text-sm font-medium transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-tokyo-purple hover:bg-tokyo-purple/90 text-tokyo-bg font-extrabold shadow-lg shadow-tokyo-purple/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <span>{isRegistering ? 'Register & Begin' : 'Sign In'}</span>
              )}
            </button>
          </form>
        </div>

        {/* Rules summary note at bottom */}
        <p className="text-xxs md:text-xs text-tokyo-muted mt-8 max-w-sm text-center leading-relaxed">
          The 75 Hard program consists of 6 daily rules: strict diet, two 45min workouts (one outdoor), 1 gal water, 10 pages non-fiction reading, and progress photo. Missing any rule resets progress to Day 1.
        </p>
      </div>
    </ErrorBoundary>
  );
}
