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
      borderColor: 'border-l-otf-orange',
      gradientFrom: 'from-otf-orange/[0.06]',
    },
    {
      label: 'Needs Fix',
      value: needsFix,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      borderColor: 'border-l-yellow-400',
      gradientFrom: 'from-yellow-400/[0.06]',
    },
    {
      label: 'Matched',
      value: matched,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      borderColor: 'border-l-green-400',
      gradientFrom: 'from-green-400/[0.06]',
    },
    {
      label: 'OTF Only',
      value: otfOnly,
      icon: Zap,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      borderColor: 'border-l-sky-400',
      gradientFrom: 'from-sky-400/[0.06]',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-gradient-to-br ${card.gradientFrom} to-transparent border border-surface-lighter border-l-4 ${card.borderColor} rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-150 cursor-default`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${card.bg}`}>
              <card.icon size={16} className={card.color} />
            </div>
            <span className="text-sm text-text-secondary font-medium">{card.label}</span>
          </div>
          <p className="text-3xl font-extrabold text-text-primary">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
