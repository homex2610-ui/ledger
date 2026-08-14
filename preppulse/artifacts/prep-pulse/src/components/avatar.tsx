export function Avatar({ src, initials, className = '', title }: { src: string | null | undefined; initials: string; className?: string; title?: string }) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold select-none ${className}`;
  if (src) {
    return <span className={base} title={title}><img src={src} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /></span>;
  }
  return <span className={base} title={title} aria-hidden="true">{initials}</span>;
}