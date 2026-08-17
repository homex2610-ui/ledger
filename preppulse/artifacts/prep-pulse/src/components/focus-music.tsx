import { useState } from 'react';
import { Link2, Music2, X } from 'lucide-react';
import { extractYouTubeId, loadFocusMusicUrl, saveFocusMusicUrl } from '@/lib/focus-music';
import { Card, SectionTitle } from '@/components/ui-elements';

export function FocusMusic() {
  const [draft, setDraft] = useState(loadFocusMusicUrl());
  const [videoId, setVideoId] = useState<string | null>(() => extractYouTubeId(loadFocusMusicUrl()));
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const id = extractYouTubeId(draft);
    if (!id) {
      setError('Paste a YouTube link — watch, shorts, or share links all work.');
      return;
    }
    setError(null);
    saveFocusMusicUrl(draft);
    setVideoId(id);
  };

  const clear = () => {
    saveFocusMusicUrl('');
    setDraft('');
    setVideoId(null);
    setError(null);
  };

  return (
    <Card className="p-5 md:p-7">
      <SectionTitle eyebrow="Background music" title="Lo-fi while you lock in" action={<Music2 size={18} className="text-primary" />} />
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Paste any YouTube link — the video plays in the background while you focus.</p>
      <div className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') apply(); }}
            placeholder="https://www.youtube.com/watch?v=…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-3 focus:ring-primary/20"
            data-testid="input-focus-music"
          />
        </div>
        <button type="button" onClick={apply} className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground" data-testid="button-focus-music-apply">Play</button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-accent" data-testid="focus-music-error">{error}</p>}
      {videoId ? (
        <div className="mt-4">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border/70 bg-sidebar">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
              title="Focus music"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              data-testid="iframe-focus-music"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground/70">Saved on this device</p>
            <button type="button" onClick={clear} className="flex items-center gap-1 rounded-lg border border-border/80 px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid="button-focus-music-clear"><X size={11} /> Remove</button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground/70">Nothing set yet — music stays on this device only.</p>
      )}
    </Card>
  );
}