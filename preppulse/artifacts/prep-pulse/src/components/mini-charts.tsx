export function Sparkline({ values, className = 'h-8 w-24', strokeClass = 'stroke-primary', areaClass = 'fill-primary/15', dotClass = 'fill-primary' }: { values: number[]; className?: string; strokeClass?: string; areaClass?: string; dotClass?: string }) {
  const safe = values.map((value) => Math.max(0, Number(value) || 0));
  if (safe.length === 0) return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className} aria-hidden="true" />;
  const max = Math.max(...safe, 1);
  const pts = safe.map((value, index) => ({ x: safe.length === 1 ? 50 : (index / (safe.length - 1)) * 100, y: 30 - (value / max) * 26 }));
  const line = pts.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={`${line} L100,32 L0,32 Z`} className={areaClass} />
      <path d={line} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" className={strokeClass} />
      <circle cx={last.x} cy={last.y} r="2.5" className={dotClass} />
    </svg>
  );
}

export function BarStrip({ values, className = 'h-8 w-24', barClass = 'bg-primary/20', lastBarClass = 'bg-accent' }: { values: number[]; className?: string; barClass?: string; lastBarClass?: string }) {
  const safe = values.map((value) => Math.max(0, Number(value) || 0));
  const max = Math.max(...safe, 1);
  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden="true">
      {safe.map((value, index) => (
        <div key={index} className={`flex-1 rounded-t-[3px] ${index === safe.length - 1 ? lastBarClass : barClass}`} style={{ height: `${Math.max(14, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export function DotStrip({ total = 7, filled, className = 'w-24', dotClassName = 'h-1.5 w-1.5' }: { total?: number; filled: number; className?: string; dotClassName?: string }) {
  const shown = Math.max(0, Math.min(filled, total));
  return (
    <div className={`flex items-center gap-1 ${className}`} aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={`shrink-0 rounded-full ${dotClassName} ${index < shown ? 'bg-primary' : 'bg-border/70'}`} />
      ))}
    </div>
  );
}

export function Ring({ value, size = 44, stroke = 4, className = '', trackClass = 'stroke-secondary', arcClass = 'stroke-accent' }: { value: number; size?: number; stroke?: number; className?: string; trackClass?: string; arcClass?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className={trackClass} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeDasharray={`${(pct / 100) * circumference} ${circumference}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} className={arcClass} />
    </svg>
  );
}
