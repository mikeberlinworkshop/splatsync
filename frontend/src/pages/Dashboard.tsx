import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, RefreshCw, LogOut, Flame, ArrowRight } from 'lucide-react';
import { api, type Comparison } from '@/lib/api';
import { WorkoutTable } from '@/components/WorkoutTable';
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
  const [days, setDays] = useState(30);
  const [notification, setNotification] = useState<{type: 'success' | 'error'; message: string; url?: string} | null>(null);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

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
      const data = await api.compareWorkouts(days);
      setComparisons(data.comparisons);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    checkAuth().then((status) => {
      if (status?.otf_connected && status?.strava_connected) {
        loadComparisons();
      } else {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when days changes (skip initial mount)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    if (authStatus.otf_connected && authStatus.strava_connected) {
      loadComparisons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const handleSync = async (comparison: Comparison) => {
    if (!comparison.otf) return;
    const action = comparison.strava
      ? `This will delete your existing Strava activity and replace it with accurate OTF data. This cannot be undone.`
      : `This will create a new Strava activity from your OTF workout data.`;
    if (!window.confirm(action)) return;
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
      setNotification({ type: 'success', message: 'Synced to Strava!', url: result.strava_url });
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncingId(null);
    }
  };

  const [syncingAll, setSyncingAll] = useState(false);

  const handleSyncAll = async () => {
    const toSync = comparisons.filter((c) => c.needs_fix && c.otf);
    if (toSync.length === 0) return;
    const replaceCount = toSync.filter((c) => c.strava).length;
    const createCount = toSync.length - replaceCount;
    let msg = `This will sync ${toSync.length} workout${toSync.length !== 1 ? 's' : ''} to Strava.`;
    if (replaceCount > 0) msg += `\n\n${replaceCount} existing Strava activit${replaceCount !== 1 ? 'ies' : 'y'} will be deleted and replaced.`;
    if (createCount > 0) msg += `\n${createCount} new activit${createCount !== 1 ? 'ies' : 'y'} will be created.`;
    msg += `\n\nThis cannot be undone. Continue?`;
    if (!window.confirm(msg)) return;
    setSyncingAll(true);
    for (const c of toSync) {
      // Skip individual confirms since we already confirmed the batch
      if (!c.otf) continue;
      setSyncingId(c.otf.id);
      try {
        const result = await api.syncWorkout(c.otf, c.strava?.id ?? undefined);
        setComparisons((prev) =>
          prev.map((p) =>
            p.otf?.id === c.otf?.id ? { ...p, status: 'synced' as const, needs_fix: false } : p
          )
        );
        setSummary((prev) => ({ ...prev, needs_fix: Math.max(0, prev.needs_fix - 1) }));
        setNotification({ type: 'success', message: 'Synced to Strava!', url: result.strava_url });
      } catch (err) {
        setNotification({ type: 'error', message: `Failed to sync ${c.otf?.class_type}: ${err instanceof Error ? err.message : 'Unknown error'}` });
      } finally {
        setSyncingId(null);
      }
    }
    setSyncingAll(false);
  };

  const needsFixCount = comparisons.filter((c) => c.needs_fix && c.otf).length;

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
            onClick={async () => {
              await api.logout();
              navigate('/');
            }}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Notification banner */}
        {notification && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl text-sm flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            <span>
              {notification.message}
              {notification.url && (
                <>
                  {' '}
                  <a
                    href={notification.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:brightness-125"
                  >
                    View on Strava
                  </a>
                </>
              )}
            </span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 opacity-60 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        )}

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h1 className="text-2xl font-bold text-text-primary">Your Workouts</h1>
              <div className="flex items-center gap-2">
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="px-3 py-2 bg-surface-light border border-surface-lighter rounded-lg text-sm text-text-secondary appearance-none cursor-pointer"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <button
                  onClick={loadComparisons}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-surface-lighter border border-surface-lighter rounded-lg text-sm text-text-secondary transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
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

            {/* Sync All button */}
            {!loading && !error && needsFixCount > 0 && (
              <div className="mb-6">
                <button
                  onClick={handleSyncAll}
                  disabled={syncingAll || syncingId !== null}
                  className="flex items-center gap-2 px-6 py-3 bg-otf-orange hover:bg-otf-orange-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-otf-orange/20"
                >
                  {syncingAll ? (
                    <><RefreshCw size={18} className="animate-spin" /> Syncing all...</>
                  ) : (
                    <>Sync All ({needsFixCount} workout{needsFixCount !== 1 ? 's' : ''}) <ArrowRight size={18} /></>
                  )}
                </button>
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
                No workouts found in the last {days} days.
              </div>
            )}

            {!loading && !error && comparisons.length > 0 && (
              <WorkoutTable
                comparisons={comparisons}
                onSync={handleSync}
                syncingId={syncingId}
              />
            )}
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
