import { useState, type FormEvent } from 'react';
import { X, Shield } from 'lucide-react';

interface OtfLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
}

export function OtfLoginModal({ open, onClose, onLogin }: OtfLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(email, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-surface-lighter rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">Connect Orangetheory</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">OTF Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-light border border-surface-lighter rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-otf-orange transition-colors"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">OTF Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-light border border-surface-lighter rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-otf-orange transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-otf-orange hover:bg-otf-orange-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect OTF Account'}
          </button>
        </form>

        <div className="mt-4 flex items-start gap-2 text-xs text-text-muted">
          <Shield size={14} className="mt-0.5 shrink-0" />
          <p>
            Your credentials are encrypted at rest and only used to fetch your
            workout data. Disconnect anytime to delete them.{' '}
            <a href="https://github.com" className="text-otf-orange hover:underline">
              View source code
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
