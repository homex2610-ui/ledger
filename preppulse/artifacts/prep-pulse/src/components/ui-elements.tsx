import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, ArrowUpRight, Check, LoaderCircle } from 'lucide-react';
import { Link } from 'wouter';

export function Card({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-border/80 bg-card shadow-[0_8px_24px_hsl(186_32%_16%/.035)] ${className}`} {...props}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">{eyebrow}</p>}<h2 className="font-display text-xl font-bold tracking-tight">{title}</h2></div>{action}</div>;
}

export function ProgressBar({ value, color = 'primary', locked = false, className = '' }: { value: number; color?: 'primary' | 'accent' | 'warm' | 'success'; locked?: boolean; className?: string }) {
  const background = color === 'accent' ? 'bg-accent' : color === 'warm' ? 'bg-[#d89b55]' : color === 'success' ? 'bg-[#2e9e63]' : 'bg-primary';
  if (locked) return <div className={`h-2 overflow-hidden rounded-full bg-secondary ${className}`}><div className="h-full rounded-full bg-muted" /></div>;
  return <div className={`h-2 overflow-hidden rounded-full bg-secondary ${className}`}><div className={`progress-fill h-full rounded-full ${background}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function StatTile({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <Card className={`p-4 ${accent ? 'border-primary/20 bg-primary text-primary-foreground' : ''}`}><p className={`font-mono-custom text-[10px] uppercase tracking-[.15em] ${accent ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{label}</p><p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p><p className={`mt-1 text-xs ${accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{detail}</p></Card>;
}

export function LoadingBlock({ className = 'h-24' }: { className?: string }) { return <div className={`skeleton rounded-2xl ${className}`} aria-label="Loading" data-testid="loading-block" />; }

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center" data-testid="status-error"><AlertCircle className="mx-auto text-destructive" size={22} /><p className="mt-2 font-semibold">The signal dropped.</p><p className="mt-1 text-sm text-muted-foreground">We couldn't load this view just now.</p><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background" data-testid="button-retry">Try again</button></div>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-secondary/35 p-8 text-center" data-testid="status-empty"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary"><Check size={19} /></div><p className="mt-3 font-display font-bold">{title}</p><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{detail}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function ButtonLink({ children, href }: { children: ReactNode; href: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline" data-testid={`link-action-${href.replace('/', '') || 'home'}`}>{children}<ArrowUpRight size={13} /></Link>;
}

export function SavingLabel({ pending }: { pending: boolean }) { return pending ? <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><LoaderCircle className="animate-spin" size={12} /> Saving</span> : <span className="text-[11px] text-primary">Saved</span>; }