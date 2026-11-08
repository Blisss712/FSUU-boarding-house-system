import { useState } from 'react';
import { X, Eye, EyeOff, GraduationCap, Home, LogIn, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ onClose, defaultMode = 'login' }) {
  const { handleAuth } = useAuth();

  const [mode, setMode]           = useState(defaultMode);
  const [role, setRole]           = useState('boarder');
  const [showPassword, setShowPw] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let result;
      if (mode === 'signup') {
        result = await api.register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role,
          phone: form.phone.trim() || undefined
        });
      } else {
        result = await api.login({ email: form.email.trim(), password: form.password });
      }
      handleAuth(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleBtn = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
        role === value
          ? value === 'boarder'
            ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-sm'
            : 'bg-amber-500 text-white border-amber-500 shadow-sm'
          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const isLandlord = role === 'landlord';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className={`px-6 pt-6 pb-5 ${isLandlord ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-[#0b1a30] to-[#1a3a6b]'}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">🏠</div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Balay Urios</h2>
              <p className="text-xs text-white/75">FSUU Student Housing Hub</p>
            </div>
          </div>

          <h3 className="text-white text-lg font-semibold mt-5 leading-snug">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h3>
          <p className="text-white/80 text-sm mt-0.5">
            {mode === 'login' ? 'Sign in to continue to your dashboard.' : 'Join as a student or landlord in seconds.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {mode === 'signup' && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">I am a…</p>
              <div className="flex gap-2">
                {roleBtn('boarder', 'Student', GraduationCap)}
                {roleBtn('landlord', 'Landlord', Home)}
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Juan dela Cruz"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20 focus:border-[#0b1a30] transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              placeholder="you@email.com"
              autoComplete="email"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20 focus:border-[#0b1a30] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                value={form.password}
                onChange={set('password')}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20 focus:border-[#0b1a30] transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+63 9XX XXX XXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20 focus:border-[#0b1a30] transition"
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all ${
              loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'
            } ${isLandlord ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0b1a30] hover:bg-[#1a3a6b]'}`}
          >
            {loading ? (
              <span className="animate-pulse">Please wait…</span>
            ) : mode === 'login' ? (
              <><LogIn className="w-4 h-4" /> Sign In</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Create Account</>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 pt-1">
            {mode === 'login' ? (
              <>No account yet?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setRole('boarder'); setError(''); }}
                  className="font-semibold text-[#0b1a30] hover:underline">
                  Sign up free
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setRole('boarder'); setError(''); }}
                  className="font-semibold text-[#0b1a30] hover:underline">
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
