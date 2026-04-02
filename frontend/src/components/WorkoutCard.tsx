import type { Comparison } from '@/lib/api';
import { ZoneBar } from './ZoneBar';
import { Flame, Heart, Clock, Zap, ArrowRight, Ruler } from 'lucide-react';

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

const CLASS_TYPE_BADGES: Record<string, string> = {
  'Tread 50': 'bg-red-500/20 text-red-400',
  'Strength 50': 'bg-purple-500/20 text-purple-400',
  'ESP': 'bg-otf-orange/20 text-otf-orange-light',
  '2G': 'bg-blue-500/20 text-blue-400',
  '3G': 'bg-green-500/20 text-green-400',
  'Lift 45': 'bg-purple-500/20 text-purple-400',
  'Tornado': 'bg-yellow-500/20 text-yellow-400',
};

function ClassTypeBadge({ classType }: { classType: string }) {
  const matchedKey = Object.keys(CLASS_TYPE_BADGES).find((key) =>
    classType.toLowerCase().includes(key.toLowerCase())
  );
  if (!matchedKey) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLASS_TYPE_BADGES[matchedKey]}`}>
      {matchedKey}
    </span>
  );
}

/** Convert meters to miles, rounded to 2 decimal places. */
function metersToMiles(m: number): number {
  return Math.round((m / 1609.34) * 100) / 100;
}

/** Format a number with commas. */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function DiffValue({
  label,
  otfValue,
  stravaValue,
  unit,
  otfOnly,
}: {
  label: string;
  otfValue: number | string;
  stravaValue?: number | string | null;
  unit?: string;
  otfOnly?: boolean;
}) {
  const otfNum = typeof otfValue === 'number' ? otfValue : null;
  const stravaNum = typeof stravaValue === 'number' ? stravaValue : null;
  const diff = otfNum !== null && stravaNum !== null ? Math.round((otfNum - stravaNum) * 100) / 100 : null;
  const hasDiff = diff !== null && Math.abs(diff) > 0.01;

  const otfDisplay = typeof otfValue === 'number' ? formatNumber(Math.round(otfValue * 100) / 100) : otfValue;
  const stravaDisplay = typeof stravaValue === 'number' ? formatNumber(Math.round(stravaValue * 100) / 100) : stravaValue;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted uppercase tracking-wide">OTF</span>
        <span className="text-otf-orange font-medium">{otfDisplay}{unit}</span>
        {!otfOnly && stravaValue != null ? (
          <>
            <span className="text-text-muted">vs</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wide">Strava</span>
            <span className="text-strava-orange font-medium">{stravaDisplay}{unit}</span>
            {hasDiff && (
              <span className={`text-xs ${diff! > 0 ? 'text-red-400' : 'text-green-400'}`}>
                ({diff! > 0 ? '+' : ''}{diff})
              </span>
            )}
          </>
        ) : otfOnly ? (
          <span className="text-xs text-text-muted">(OTF only)</span>
        ) : null}
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

  // Convert Strava distance (meters) to miles for comparison
  const stravaDistanceMiles = strava?.distance ? metersToMiles(strava.distance) : null;

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-4 sm:p-5 hover:border-otf-orange/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary truncate">
              {otf?.class_type || strava?.name || 'Workout'}
            </h3>
            {otf?.class_type && <ClassTypeBadge classType={otf.class_type} />}
            <StatusBadge status={status} needsFix={needs_fix} />
          </div>
          <p className="text-sm text-text-muted">{dateStr} at {timeStr}</p>
        </div>
        {needs_fix && otf && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => onSync(comparison)}
              disabled={syncing}
              className="flex items-center gap-1.5 px-4 py-2 bg-otf-orange hover:bg-otf-orange-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync to Strava'}
              <ArrowRight size={14} />
            </button>
            <span className="text-[10px] text-text-muted max-w-[160px] text-right leading-tight">
              Replace Strava activity with accurate OTF data
            </span>
          </div>
        )}
      </div>

      {otf && (
        <div className="space-y-2">
          {/* Distance and speed */}
          {otf.tread_distance_miles != null && (
            <DiffValue
              label="Tread Distance"
              otfValue={otf.tread_distance_miles}
              stravaValue={stravaDistanceMiles}
              unit=" mi"
            />
          )}
          {otf.tread_avg_pace && (
            <DiffValue
              label="Avg Pace"
              otfValue={otf.tread_avg_pace}
              otfOnly
              unit=""
            />
          )}
          {otf.rower_distance_meters != null && (
            <DiffValue
              label="Rower Distance"
              otfValue={Math.round(otf.rower_distance_meters)}
              otfOnly
              unit=" m"
            />
          )}

          {/* Calories and HR */}
          <DiffValue
            label="Calories"
            otfValue={otf.calories}
            stravaValue={strava?.calories ?? null}
            unit=" cal"
          />
          <DiffValue
            label="Avg HR"
            otfValue={otf.avg_hr}
            stravaValue={strava?.avg_hr ?? null}
            unit=" bpm"
          />
          <DiffValue
            label="Max HR"
            otfValue={otf.max_hr}
            stravaValue={strava?.max_hr ?? null}
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
            {strava.calories || '\u2014'} cal
          </div>
          <div className="flex items-center gap-1">
            <Heart size={14} />
            {strava.avg_hr || '\u2014'} bpm avg
          </div>
          {strava.distance != null && (
            <div className="flex items-center gap-1">
              <Ruler size={14} />
              {metersToMiles(strava.distance)} mi
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={14} />
            {Math.round(strava.duration_minutes)}min
          </div>
        </div>
      )}
    </div>
  );
}
