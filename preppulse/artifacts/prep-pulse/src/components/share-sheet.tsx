import { useMemo, useState } from 'react';
import { Check, Copy, Globe2, Lock, MessageCircle, Send, Users, X } from 'lucide-react';
import { useRecordSharePromptEvent, type ShareArtifact } from '@workspace/api-client-react';
import { DailyFocusCard } from '@/components/daily-focus-card';
import { shareUrlFor } from '@/lib/share';

const VISIBILITIES = [
  { value: 'public', label: 'Anyone', detail: 'Anyone with the link', icon: Globe2 },
  { value: 'circle', label: 'Circle', detail: 'Your circle (coming in a later phase)', icon: Users },
  { value: 'private', label: 'Private', detail: 'Only you', icon: Lock },
] as const;

export function ShareSheet({
  artifact,
  onClose,
}: {
  artifact: ShareArtifact;
  onClose: () => void;
}) {
  const recordEvent = useRecordSharePromptEvent();
  const [visibility, setVisibility] = useState<'public' | 'circle' | 'private'>('public');
  const [copied, setCopied] = useState<'copy' | 'discord' | null>(null);
  const shareUrl = useMemo(() => shareUrlFor(artifact.id), [artifact.id]);

  const fireClicked = () => {
    recordEvent.mutate({ data: { event: 'share_clicked', artifactId: artifact.id } });
  };

  const copyText = async (text: string, target: 'copy' | 'discord') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      return;
    }
  };

  const openShare = (url: string) => {
    fireClicked();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const message = `${artifact.payload.displayName} studied ${artifact.payload.minutesLabel} today on Ledger. Join and keep every minute counted: ${shareUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/40 p-4" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl md:p-6" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Share your focus card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">Share your day</p>
            <h2 className="mt-1 font-display text-xl font-bold">Daily focus card</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Close share sheet" data-testid="button-close-share-sheet"><X size={17} /></button>
        </div>

        <div className="mt-4">
          <DailyFocusCard artifact={artifact} />
        </div>

        <p className="mt-4 font-mono-custom text-[9px] uppercase tracking-[.16em] text-muted-foreground">Who can see it?</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {VISIBILITIES.map(({ value, label, detail, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={`rounded-xl border p-3 text-left transition-colors ${visibility === value ? 'border-primary/40 bg-primary/5' : 'border-border/70 hover:bg-secondary/60'}`}
              data-testid={`share-visibility-${value}`}
            >
              <Icon size={14} className={visibility === value ? 'text-primary' : 'text-muted-foreground'} />
              <p className="mt-1.5 text-[11px] font-bold">{label}</p>
              <p className="mt-0.5 text-[9.5px] leading-snug text-muted-foreground">{detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(message)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 px-3 py-2.5 text-xs font-bold text-[#25D366] transition-colors hover:bg-[#25D366]/25" data-testid="button-share-whatsapp"><MessageCircle size={14} /> WhatsApp</button>
          <button type="button" onClick={() => openShare(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#229ED9]/15 px-3 py-2.5 text-xs font-bold text-[#229ED9] transition-colors hover:bg-[#229ED9]/25" data-testid="button-share-telegram"><Send size={14} /> Telegram</button>
          <button type="button" onClick={() => { fireClicked(); void copyText(`${message}`, 'discord'); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2]/15 px-3 py-2.5 text-xs font-bold text-[#5865F2] transition-colors hover:bg-[#5865F2]/25" data-testid="button-share-discord">{copied === 'discord' ? <Check size={14} /> : <MessageCircle size={14} />}{copied === 'discord' ? 'Copied!' : 'Discord'}</button>
          <button type="button" onClick={() => { fireClicked(); void copyText(shareUrl, 'copy'); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-bold hover:bg-secondary" data-testid="button-share-copy">{copied === 'copy' ? <Check size={14} /> : <Copy size={14} />}{copied === 'copy' ? 'Copied!' : 'Copy link'}</button>
        </div>

        <p className="mt-4 rounded-xl bg-secondary/50 px-3 py-2.5 text-center font-mono-custom text-[9px] text-muted-foreground" data-testid="share-sheet-url">{shareUrl}</p>
      </div>
    </div>
  );
}