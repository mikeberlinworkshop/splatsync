import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, RefreshCw, LogOut, Flame } from 'lucide-react';
import { api, type Comparison } from '@/lib/api';
import { WorkoutCard } from '@/components/WorkoutCard';
import { SummaryCards } from '@/components/SummaryCards';
import { OtfLoginModal } from '@/components/OtfLoginModal';

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [summary, setSummary] = useState({
    total_otf: 0,
    total_strava: 0,
    matched: 0,
    needs_fix: 0,
    otf_only: 0,
  });
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState({
    otf_connected: false,
    strava_connected: false,
    email: null as string | null,
  });
  const [showOtfModal, setShowOtfModal] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const status = await api.authStatus();
      setAuthStatus(status);
      return status;
    } catch {
      navigate('/');
      return null;
    }
  }, [navigate]);

  const loadComparisons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.compareWorkouts(30);
      setComparisons(data.comparisons);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth().then((status) => {
      if (status?.otf_connected && status?.strava_connected) {
        loadComparisons();
      } else {
        setLoading(false);
      }
    });
  }, [checkAuth, loadComparisons]);

  const handleSync = async (comparison: Comparison) => {
    if (!comparison.otf) return;
    setSyncingId(comparison.otf.id);
    try {
      const result = await api.syncWorkout(
        comparison.otf,
        comparison.strava?.id ?? undefined
      );
      // Update the comparison in state
      setComparisons((prev) =>
        prev.map((c) =>
          c.otf?.id === comparison.otf?.id
            ? { ...c, status: 'synced' as const, needs_fix: false }
            : c
        )
      );
      setSummary((prev) => ({
        ...prev,
        needs_fix: Math.max(0, prev.needs_fix - 1),
      }));
      alert(`Synced! View on Strava: ${result.strava_url}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleOtfLogin = async (email: string, password: string) => {
    await api.otfLogin(email, password);
    const status = await checkAuth();
    if (status?.strava_connected) {
      loadComparisons();
    }
  };

  const handleStravaConnect = async () => {
    const { url } = await api.stravaConnectUrl();
    window.location.href = url;
  };

  const bothConnected = authStatus.otf_connected && authStatus.strava_connected;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap size={24} className="text-otf-orange" />
          <span className="text-xl font-bold text-text-primary">SplatSync</span>
        </div>
        <div className="flex items-center gap-3">
          {authStatus.email && (
            <span className="text-sm text-text-secondary">{authStatus.email}</span>
          )}
          <button
            onClick={() => navigate('/')}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Connection status */}
        {!bothConnected && (
          <div className="bg-surface border border-surface-lighter rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Connect your accounts
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              {!authStatus.otf_connected && (
                <button
                  onClick={() => setShowOtfModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-otf-orange hover:bg-otf-orange-dark text-white font-medium rounded-lg transition-colors"
                >
                  <Flame size={18} />
                  Connect OTF
                </button>
              )}
              {authStatus.otf_connected && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                  <Flame size={16} />
                  OTF Connected
                </div>
              )}
              {!authStatus.strava_connected && (
                <button
                  onClick={handleStravaConnect}
                  className="flex items-center gap-2 px-6 py-3 bg-strava-orange hover:bg-strava-orange/90 text-white font-medium rounded-lg transition-colors"
                >
                  Connect Strava
                </button>
              )}
              {authStatus.strava_connected && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                  Strava Connected
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard content */}
        {bothConnected && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-text-primary">Your Workouts</h1>
              <button
                onClick={loadComparisons}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-surface-lighter border border-surface-lighter rounded-lg text-sm text-text-secondary transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {!loading && !error && (
              <div className="mb-8">
                <SummaryCards
                  totalOtf={summary.total_otf}
                  matched={summary.matched}
                  needsFix={summary.needs_fix}
                  otfOnly={summary.otf_only}
                />
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-text-secondary">
                  <RefreshCw size={20} className="animate-spin text-otf-orange" />
                  <span>Loading workouts from OTF and Strava...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-6">
                {error}
              </div>
            )}

            {!loading && !error && comparisons.length === 0 && (
              <div className="text-center py-20 text-text-muted">
                No workouts found in the last 30 days.
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {comparisons.map((c, i) => (
                <WorkoutCard
                  key={c.otf?.id || c.strava?.id || i}
                  comparison={c}
                  onSync={handleSync}
                  syncing={syncingId === c.otf?.id}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <OtfLoginModal
        open={showOtfModal}
        onClose={() => setShowOtfModal(false)}
        onLogin={handleOtfLogin}
      />
    </div>
  );
}
