import { Flame, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface SummaryCardsProps {
  totalOtf: number;
  matched: number;
  needsFix: number;
  otfOnly: number;
}

export function SummaryCards({ totalOtf, matched, needsFix, otfOnly }: SummaryCardsProps) {
  const cards = [
    {
      label: 'OTF Workouts',
      value: totalOtf,
      icon: Flame,
      color: 'text-otf-orange',
      bg: 'bg-otf-orange/10',
    },
    {
      label: 'Needs Fix',
      value: needsFix,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    {
      label: 'Matched',
      value: matched,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      label: 'OTF Only',
      value: otfOnly,
      icon: Zap,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface border border-surface-lighter rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${card.bg}`}>
              <card.icon size={16} className={card.color} />
            </div>
            <span className="text-sm text-text-secondary">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
