import { ArrowRight, RefreshCw } from 'lucide-react';
import type { Comparison } from '@/lib/api';
import { ZoneBar } from './ZoneBar';

interface WorkoutDetailProps {
  comparison: Comparison;
  onSync: (comparison: Comparison) => void;
  syncingId: string | null;
}

function metersToMiles(m: number): string {
  return (m / 1609.34).toFixed(2);
}

function mpsToMph(mps: number): string {
  return (mps * 2.237).toFixed(1);
}

function Stat({ label, value, unit, color }: { label: string; value: string | number | null | undefined; unit?: string; color?: string }) {
  if (value == null) return null;
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-text-secondary text-sm">{label}</span>
      <span className={`font-medium text-sm ${color || 'text-text-primary'}`}>
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}{unit || ''}
      </span>
    </div>
  );
}

export function WorkoutDetail({ comparison, onSync, syncingId }: WorkoutDetailProps) {
  const { otf, strava, needs_fix } = comparison;

  return (
    <div className="px-4 sm:px-6 py-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* OTF Column */}
        {otf && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-otf-orange font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-otf-orange inline-block"></span>
              OTF Data
            </h4>
            <div className="space-y-0 divide-y divide-surface-lighter/50">
              <Stat label="Calories" value={otf.calories} color="text-otf-orange" />
              <Stat label="Avg HR" value={otf.avg_hr} unit=" bpm" color="text-otf-orange" />
              <Stat label="Max HR" value={otf.max_hr} unit=" bpm" color="text-otf-orange" />
              {otf.tread_distance_miles != null && (
                <Stat label="Tread Distance" value={`${otf.tread_distance_miles.toFixed(2)} mi`} color="text-otf-orange" />
              )}
              {otf.tread_avg_pace && (
                <Stat label="Avg Pace" value={otf.tread_avg_pace.replace(/ min\/mile/i, '/mi')} color="text-otf-orange" />
              )}
              {otf.rower_distance_meters != null && (
                <Stat label="Rower Distance" value={`${Math.round(otf.rower_distance_meters).toLocaleString()} m`} color="text-otf-orange" />
              )}
              <Stat label="Splat Points" value={otf.splat_points} color="text-otf-orange" />
              <Stat label="Duration" value={`${otf.duration_minutes} min`} color="text-otf-orange" />
            </div>
            {otf.zone_minutes && (
              <div className="mt-4">
                <ZoneBar zones={otf.zone_minutes} />
              </div>
            )}
          </div>
        )}

        {/* Strava Column */}
        {strava && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-strava-orange font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-strava-orange inline-block"></span>
              Strava Data
            </h4>
            <div className="space-y-0 divide-y divide-surface-lighter/50">
              <Stat label="Calories" value={strava.calories} color="text-strava-orange" />
              <Stat label="Avg HR" value={strava.avg_hr} unit=" bpm" color="text-strava-orange" />
              <Stat label="Max HR" value={strava.max_hr} unit=" bpm" color="text-strava-orange" />
              {strava.distance != null && (
                <Stat label="Distance" value={`${metersToMiles(strava.distance)} mi`} color="text-strava-orange" />
              )}
              {strava.avg_speed != null && (
                <Stat label="Avg Speed" value={`${mpsToMph(strava.avg_speed)} mph`} color="text-strava-orange" />
              )}
              <Stat label="Duration" value={`${Math.round(strava.duration_minutes)} min`} color="text-strava-orange" />
              <Stat label="Sport Type" value={strava.sport_type.replace(/root='|'/g, '')} color="text-strava-orange" />
            </div>
          </div>
        )}

        {/* OTF only — show single column */}
        {!strava && otf && (
          <div className="flex items-center justify-center text-text-muted text-sm">
            No matching Strava activity found.
          </div>
        )}
      </div>

      {/* Sync button at bottom of detail */}
      {needs_fix && otf && (
        <div className="mt-6 pt-4 border-t border-surface-lighter flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-text-muted max-w-md">
            Replaces your Strava activity with accurate OTF heart rate, calories, and distance data.
          </p>
          <button
            onClick={() => onSync(comparison)}
            disabled={syncingId === otf.id}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-otf-orange hover:bg-otf-orange-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {syncingId === otf.id ? (
              <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
            ) : (
              <>Sync to Strava <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
