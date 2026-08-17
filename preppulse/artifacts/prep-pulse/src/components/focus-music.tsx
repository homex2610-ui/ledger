import { useEffect, useRef, useState } from 'react';
import { Link2, Music2, Pause, Play, X } from 'lucide-react';
import { extractYouTubeId, loadFocusMusicUrl, saveFocusMusicUrl } from '@/lib/focus-music';
import { Card, SectionTitle } from '@/components/ui-elements';

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

type YTPlayerConfig = {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number | boolean>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
  };
};

declare global {
  interface Window {
    YT?: {
      Player: new (hostId: string, config: YTPlayerConfig) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_STATES = { PLAYING: 1 };

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement('script');
    tag.id = 'ledger-yt-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });
}

export function FocusMusic() {
  const [draft, setDraft] = useState(loadFocusMusicUrl());
  const [videoId, setVideoId] = useState<string | null>(() => extractYouTubeId(loadFocusMusicUrl()));
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled) return;
      void new window.YT!.Player('focus-music-player', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            setPlaying(true);
            try { event.target.playVideo(); } catch { /* autoplay may be blocked */ }
          },
          onStateChange: (event) => setPlaying(event.data === YT_STATES.PLAYING),
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

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

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (playing) player.pauseVideo();
      else player.playVideo();
    } catch { /* player not ready */ }
  };

  const clear = () => {
    saveFocusMusicUrl('');
    setDraft('');
    setVideoId(null);
    setPlaying(false);
    setError(null);
  };

  return (
    <Card className="p-5 md:p-7">
      <SectionTitle eyebrow="Background music" title="Lo-fi while you lock in" action={<Music2 size={18} className="text-primary" />} />
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Paste any YouTube link — the audio keeps playing while you focus.</p>
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
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border/70 bg-sidebar" data-testid="iframe-focus-music">
            <div id="focus-music-player" className="absolute inset-0" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button type="button" onClick={toggle} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground" data-testid="button-focus-music-toggle">
              {playing ? <Pause size={11} /> : <Play size={11} fill="currentColor" />}{playing ? 'Pause' : 'Play'}
            </button>
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