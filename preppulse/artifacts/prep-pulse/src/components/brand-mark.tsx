export function BrandMark({ size = 40, className = '', shadow = true }: { size?: number; className?: string; shadow?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[22%] ${shadow ? 'shadow-sm' : ''} ${className}`}
      style={{ width: size, height: size, background: 'linear-gradient(135deg, hsl(166 62% 51%), hsl(168 52% 36%))' }}
      aria-hidden="true"
      data-testid="brand-mark"
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none">
        <path d="M2.5 16h3.4l1.5-3.4 1.6-5.4 1.5 11 1.4-6.2 1.2 2.4h6.9" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7.2" r="2.3" fill="#e8612b" />
      </svg>
    </span>
  );
}