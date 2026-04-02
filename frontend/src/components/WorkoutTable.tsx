import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import type { Comparison } from '@/lib/api';
import { WorkoutDetail } from './WorkoutDetail';

interface WorkoutTableProps {
  comparisons: Comparison[];
  onSync: (comparison: Comparison) => void;
  syncingId: string | null;
}

// --- Helpers ---

function metersToMiles(m: number): string {
  return (m / 1609.34).toFixed(2);
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Badges ---

const CLASS_TYPE_COLORS: Record<string, string> = {
  'Tread 50': 'bg-red-500/20 text-red-400',
  'Strength 50': 'bg-purple-500/20 text-purple-400',
  'ESP': 'bg-otf-orange/20 text-otf-orange-light',
  '2G': 'bg-blue-500/20 text-blue-400',
  '3G': 'bg-green-500/20 text-green-400',
  'Lift 45': 'bg-purple-500/20 text-purple-400',
  'Tornado': 'bg-yellow-500/20 text-yellow-400',
};

function ClassTypeBadge({ classType }: { classType: string }) {
  const matchedKey = Object.keys(CLASS_TYPE_COLORS).find((key) =>
    classType.toLowerCase().includes(key.toLowerCase())
  );
  const colors = matchedKey ? CLASS_TYPE_COLORS[matchedKey] : 'bg-surface-lighter text-text-secondary';
  const label = matchedKey || classType;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colors}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status, needsFix }: { status: string; needsFix: boolean }) {
  if (status === 'synced') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 whitespace-nowrap">
        Synced
      </span>
    );
  }
  if (status === 'otf_only') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 whitespace-nowrap">
        OTF Only
      </span>
    );
  }
  if (needsFix) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-otf-orange/20 text-otf-orange-light whitespace-nowrap">
        Needs Fix
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 whitespace-nowrap">
      Matched
    </span>
  );
}

// --- Diff display ---

function CalDiff({ diff }: { diff: number }) {
  if (Math.abs(diff) < 1) return <span className="text-text-muted">--</span>;
  const color = Math.abs(diff) > 50 ? 'text-red-400' : 'text-green-400';
  return <span className={`font-medium ${color}`}>{diff > 0 ? '+' : ''}{Math.round(diff)}</span>;
}

// --- Table (Desktop) ---

function DesktopTable({ comparisons, onSync, syncingId, expandedId, onToggle }: WorkoutTableProps & { expandedId: string | null; onToggle: (id: string) => void }) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-surface-lighter">
            <th className="py-3 px-3 text-left w-8"></th>
            <th className="py-3 px-3 text-left">Date</th>
            <th className="py-3 px-3 text-left">Class</th>
            <th className="py-3 px-3 text-right">OTF Cal</th>
            <th className="py-3 px-3 text-right">Strava Cal</th>
            <th className="py-3 px-3 text-right">Diff</th>
            <th className="py-3 px-3 text-right">OTF Dist</th>
            <th className="py-3 px-3 text-right">Strava Dist</th>
            <th className="py-3 px-3 text-center">Status</th>
            <th className="py-3 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c, i) => {
            const rowId = c.otf?.id || String(c.strava?.id) || String(i);
            const isExpanded = expandedId === rowId;
            const workout = c.otf || c.strava;
            if (!workout) return null;

            const otfDist = c.otf?.tread_distance_miles;
            const stravaDist = c.strava?.distance;

            return (
              <TableRowGroup key={rowId}>
                <tr
                  onClick={() => onToggle(rowId)}
                  className={`cursor-pointer transition-colors ${
                    i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                  } hover:bg-white/[0.05] ${isExpanded ? 'bg-white/[0.05]' : ''}`}
                >
                  <td className="py-3 px-3 text-text-muted">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="py-3 px-3 text-text-primary whitespace-nowrap">
                    {formatDate(workout.date)}
                  </td>
                  <td className="py-3 px-3">
                    {c.otf?.class_type ? (
                      <ClassTypeBadge classType={c.otf.class_type} />
                    ) : (
                      <span className="text-text-secondary">{c.strava?.name || '--'}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-otf-orange font-medium">
                    {c.otf?.calories ?? '--'}
                  </td>
                  <td className="py-3 px-3 text-right text-strava-orange font-medium">
                    {c.strava?.calories ?? '--'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {c.diffs ? <CalDiff diff={c.diffs.calories} /> : <span className="text-text-muted">--</span>}
                  </td>
                  <td className="py-3 px-3 text-right text-otf-orange">
                    {otfDist != null ? `${otfDist.toFixed(2)} mi` : '--'}
                  </td>
                  <td className="py-3 px-3 text-right text-strava-orange">
                    {stravaDist != null ? `${metersToMiles(stravaDist)} mi` : '--'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={c.status} needsFix={c.needs_fix} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    {c.needs_fix && c.otf ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSync(c);
                        }}
                        disabled={syncingId === c.otf.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-otf-orange hover:bg-otf-orange-dark text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {syncingId === c.otf.id ? (
                          <><RefreshCw size={12} className="animate-spin" /> Syncing</>
                        ) : (
                          <>Sync <ArrowRight size={12} /></>
                        )}
                      </button>
                    ) : c.status === 'synced' || (!c.needs_fix && c.strava) ? (
                      <Check size={16} className="text-green-400 inline" />
                    ) : null}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <div className="border-t border-surface-lighter bg-surface-light/50">
                        <WorkoutDetail comparison={c} onSync={onSync} syncingId={syncingId} />
                      </div>
                    </td>
                  </tr>
                )}
              </TableRowGroup>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Fragment wrapper so two <tr> elements can live together in tbody */
function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// --- Mobile List ---

function MobileList({ comparisons, onSync, syncingId, expandedId, onToggle }: WorkoutTableProps & { expandedId: string | null; onToggle: (id: string) => void }) {
  return (
    <div className="md:hidden space-y-1">
      {comparisons.map((c, i) => {
        const rowId = c.otf?.id || String(c.strava?.id) || String(i);
        const isExpanded = expandedId === rowId;
        const workout = c.otf || c.strava;
        if (!workout) return null;

        const otfCal = c.otf?.calories;
        const stravaCal = c.strava?.calories;
        const calDiff = c.diffs?.calories;
        const otfDist = c.otf?.tread_distance_miles;
        const stravaDist = c.strava?.distance;

        return (
          <div key={rowId} className="bg-surface rounded-lg border border-surface-lighter">
            <button
              onClick={() => onToggle(rowId)}
              className="w-full text-left px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {formatDate(workout.date)}
                  </span>
                  <span className="text-text-muted">·</span>
                  {c.otf?.class_type ? (
                    <ClassTypeBadge classType={c.otf.class_type} />
                  ) : (
                    <span className="text-sm text-text-secondary">{c.strava?.name}</span>
                  )}
                </div>
                <StatusBadge status={c.status} needsFix={c.needs_fix} />
              </div>
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>
                  {otfCal != null && stravaCal != null ? (
                    <>
                      <span className="text-otf-orange">{otfCal}</span>
                      {' cal vs '}
                      <span className="text-strava-orange">{stravaCal}</span>
                      {calDiff != null && Math.abs(calDiff) >= 1 && (
                        <span className={Math.abs(calDiff) > 50 ? 'text-red-400' : 'text-green-400'}>
                          {' '}({calDiff > 0 ? '+' : ''}{Math.round(calDiff)})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-otf-orange">{otfCal ?? stravaCal ?? '--'} cal</span>
                  )}
                  {(otfDist != null || stravaDist != null) && (
                    <>
                      <span className="text-text-muted"> · </span>
                      {otfDist != null && stravaDist != null ? (
                        <>
                          <span className="text-otf-orange">{otfDist.toFixed(2)}</span>
                          {'mi vs '}
                          <span className="text-strava-orange">{metersToMiles(stravaDist)}</span>
                          {'mi'}
                        </>
                      ) : (
                        <span>{otfDist != null ? `${otfDist.toFixed(2)}mi` : `${metersToMiles(stravaDist!)}mi`}</span>
                      )}
                    </>
                  )}
                </span>
                {c.needs_fix && c.otf && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onSync(c);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-otf-orange hover:bg-otf-orange-dark text-white text-xs font-medium rounded-lg ml-2"
                  >
                    {syncingId === c.otf.id ? (
                      <><RefreshCw size={10} className="animate-spin" /> Syncing</>
                    ) : (
                      <>Sync <ArrowRight size={10} /></>
                    )}
                  </span>
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-surface-lighter bg-surface-light/50">
                <WorkoutDetail comparison={c} onSync={onSync} syncingId={syncingId} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main Export ---

export function WorkoutTable({ comparisons, onSync, syncingId }: WorkoutTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <DesktopTable
        comparisons={comparisons}
        onSync={onSync}
        syncingId={syncingId}
        expandedId={expandedId}
        onToggle={handleToggle}
      />
      <MobileList
        comparisons={comparisons}
        onSync={onSync}
        syncingId={syncingId}
        expandedId={expandedId}
        onToggle={handleToggle}
      />
    </>
  );
}
