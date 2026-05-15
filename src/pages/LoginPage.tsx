import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import ThemeToggle from '../components/ThemeToggle';
import keyIcon from '../assets/key-icon.png';
import wordmarkBlack from '../assets/wordmark-black.png';
import wordmarkWhite from '../assets/wordmark-white.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, accessToken } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If we land on /login already authenticated (e.g. came from logout then
  // re-loaded the route), bounce to /fonts after render so we don't update
  // BrowserRouter state inside LoginPage's render.
  useEffect(() => {
    if (accessToken) navigate('/fonts', { replace: true });
  }, [accessToken, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/fonts', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center px-6 relative">
      <div className="absolute top-3 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={keyIcon} alt="" aria-hidden="true" className="h-10 mx-auto mb-4" />
          <img
            src={wordmarkBlack}
            alt="TypeStack"
            className="h-12 mx-auto dark:hidden"
          />
          <img
            src={wordmarkWhite}
            alt="TypeStack"
            className="h-12 mx-auto hidden dark:block"
          />
          <p className="text-zinc-500 text-sm mt-2">font management</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-3 bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 rounded-xl p-6"
        >
          <label className="block">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Email</span>
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-white border border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-600"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
              onKeyDown={(e) => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
              className="mt-1 w-full bg-white border border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-600"
            />
            {capsLock && (
              <span className="block text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                Caps Lock is on
              </span>
            )}
          </label>
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/50 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium py-2 rounded-md disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
