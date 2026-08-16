export function Avatar({ src, initials, className = '', title }: { src: string | null | undefined; initials: string; className?: string; title?: string }) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold select-none ${className}`;
  if (src) {
    return <span className={base} title={title}><img src={src} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /></span>;
  }
  return <span className={base} title={title} aria-hidden="true">{initials}</span>;
}

const AVATAR_HUES = [
  'bg-accent/15 text-accent',
  'bg-warm/15 text-warm',
  'bg-success/15 text-success',
  'bg-primary/15 text-primary',
  'bg-destructive/15 text-destructive',
];

export function avatarColorFor(userId: string): string {
  let hash = 5381;
  for (let i = 0; i < userId.length; i += 1) hash = ((hash << 5) + hash) ^ userId.charCodeAt(i);
  return AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
}