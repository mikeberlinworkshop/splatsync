interface ZoneBarProps {
  zones?: {
    gray: number;
    blue: number;
    green: number;
    orange: number;
    red: number;
  };
}

const ZONE_COLORS = {
  gray: '#96999C',
  blue: '#0072CE',
  green: '#3EB649',
  orange: '#F05A28',
  red: '#E02020',
};

const ZONE_LABELS = {
  gray: 'Gray',
  blue: 'Blue',
  green: 'Green',
  orange: 'Orange',
  red: 'Red',
};

export function ZoneBar({ zones }: ZoneBarProps) {
  if (!zones) return null;

  const total = zones.gray + zones.blue + zones.green + zones.orange + zones.red;
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex h-3 rounded-full overflow-hidden">
        {(Object.keys(ZONE_COLORS) as Array<keyof typeof ZONE_COLORS>).map((zone) => {
          const pct = (zones[zone] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={zone}
              style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[zone] }}
              title={`${ZONE_LABELS[zone]}: ${zones[zone]}min`}
            />
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-text-secondary">
        {(Object.keys(ZONE_COLORS) as Array<keyof typeof ZONE_COLORS>).map((zone) => {
          if (!zones[zone]) return null;
          return (
            <span key={zone} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: ZONE_COLORS[zone] }}
              />
              {zones[zone]}m
            </span>
          );
        })}
      </div>
    </div>
  );
}
