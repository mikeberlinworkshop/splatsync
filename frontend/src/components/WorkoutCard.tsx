import type { Comparison } from '@/lib/api';
import { ZoneBar } from './ZoneBar';
import { Flame, Heart, Clock, Zap, ArrowRight } from 'lucide-react';

interface WorkoutCardProps {
  comparison: Comparison;
  onSync: (comparison: Comparison) => void;
  syncing?: boolean;
}

function StatusBadge({ status, needsFix }: { status: string; needsFix: boolean }) {
  if (status === 'synced') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        Synced
      </span>
    );
  }
  if (status === 'otf_only') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
        OTF Only
      </span>
    );
  }
  if (needsFix) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-otf-orange/20 text-otf-orange-light">
        Needs Fix
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-lighter text-text-secondary">
      Matched
    </span>
  );
}

function DiffValue({ label, otf, strava, unit }: { label: string; otf: number; strava: number | null; unit?: string }) {
  const diff = strava !== null ? otf - strava : null;
  const hasDiff = diff !== null && Math.abs(diff) > 0;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-otf-orange font-medium">{otf}{unit}</span>
        {strava !== null && (
          <>
            <span className="text-text-muted">vs</span>
            <span className="text-strava-orange font-medium">{Math.round(strava)}{unit}</span>
            {hasDiff && (
              <span className={`text-xs ${diff! > 0 ? 'text-red-400' : 'text-green-400'}`}>
                ({diff! > 0 ? '+' : ''}{diff})
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function WorkoutCard({ comparison, onSync, syncing }: WorkoutCardProps) {
  const { otf, strava, status, needs_fix } = comparison;
  const workout = otf || strava;
  if (!workout) return null;

  const date = new Date(workout.date);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-5 hover:border-otf-orange/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary">
              {otf?.class_type || strava?.name || 'Workout'}
            </h3>
            <StatusBadge status={status} needsFix={needs_fix} />
          </div>
          <p className="text-sm text-text-muted">{dateStr} at {timeStr}</p>
        </div>
        {needs_fix && otf && (
          <button
            onClick={() => onSync(comparison)}
            disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-2 bg-otf-orange hover:bg-otf-orange-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Fix'}
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {otf && (
        <div className="space-y-2">
          <DiffValue
            label="Calories"
            otf={otf.calories}
            strava={strava?.calories ?? null}
            unit=" cal"
          />
          <DiffValue
            label="Avg HR"
            otf={otf.avg_hr}
            strava={strava?.avg_hr ?? null}
            unit=" bpm"
          />
          <DiffValue
            label="Max HR"
            otf={otf.max_hr}
            strava={strava?.max_hr ?? null}
            unit=" bpm"
          />

          <div className="flex items-center gap-4 text-sm text-text-secondary pt-1">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {otf.duration_minutes}min
            </span>
            <span className="flex items-center gap-1">
              <Zap size={14} className="text-otf-orange" />
              {otf.splat_points} splats
            </span>
          </div>

          {otf.zone_minutes && (
            <div className="pt-2">
              <ZoneBar zones={otf.zone_minutes} />
            </div>
          )}
        </div>
      )}

      {status === 'strava_only' && strava && (
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex items-center gap-1">
            <Flame size={14} />
            {strava.calories || '—'} cal
          </div>
          <div className="flex items-center gap-1">
            <Heart size={14} />
            {strava.avg_hr || '—'} bpm avg
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            {Math.round(strava.duration_minutes)}min
          </div>
        </div>
      )}
    </div>
  );
}
