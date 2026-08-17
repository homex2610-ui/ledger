import { useEffect, useRef, useState } from 'react';
import { CloudRain, Headphones, Link2, Music2, Pause, Play, Volume2, X } from 'lucide-react';
import { extractYouTubeId, loadFocusMusicUrl, saveFocusMusicUrl } from '@/lib/focus-music';
import { Card, SectionTitle } from '@/components/ui-elements';

const PRESETS = [
  { label: 'Lo-fi', id: 'jfKfPfyJRdk', icon: Headphones },
  { label: 'Rain', id: '7klljnYrw4k', icon: CloudRain },
];

const VOLUME_KEY = 'pp-focus-music-volume';

function loadVolume(): number {
  try {
    const raw = Number(localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(raw) && raw >= 0 && raw <= 100) return raw;
  } catch {
    return 80;
  }
  return 80;
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
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
    onError?: (event: { data: number }) => void;
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
  const [title, setTitle] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(loadVolume);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

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
            try { event.target.setVolume(volumeRef.current); } catch { /* player not ready */ }
            setPlaying(true);
            try { event.target.playVideo(); } catch { /* autoplay may be blocked */ }
          },
          onStateChange: (event) => setPlaying(event.data === YT_STATES.PLAYING),
          onError: () => setError('This audio isn\u2019t available right now \u2014 try another preset or a fresh link.'),
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  const playId = (id: string) => {
    setError(null);
    const watch = `https://www.youtube.com/watch?v=${id}`;
    saveFocusMusicUrl(watch);
    setDraft(watch);
    setVideoId(id);
    setTitle(null);
    void fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`)
      .then((response) => (response.ok ? response.json() as Promise<{ title?: string }> : null))
      .then((data) => { if (data?.title) setTitle(data.title); })
      .catch(() => { return; });
  };

  const apply = () => {
    const id = extractYouTubeId(draft);
    if (!id) {
      setError('Paste a YouTube link — watch, shorts, or share links all work.');
      return;
    }
    playId(id);
  };

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (playing) player.pauseVideo();
      else player.playVideo();
    } catch { /* player not ready */ }
  };

  const changeVolume = (next: number) => {
    setVolume(next);
    try { localStorage.setItem(VOLUME_KEY, String(next)); } catch { return; }
    try { playerRef.current?.setVolume(next); } catch { /* player not ready */ }
  };

  const clear = () => {
    saveFocusMusicUrl('');
    setDraft('');
    setVideoId(null);
    setTitle(null);
    setPlaying(false);
    setError(null);
  };

  return (
    <Card className="p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_hsl(186_32%_16%/.08)] md:p-5">
      <SectionTitle eyebrow="Background music" title="Focus audio" action={playing && videoId ? <span className="pp-eq"><span /><span /><span /><span /></span> : <Music2 size={18} className="text-primary" />} />
      <p className="text-sm leading-relaxed text-muted-foreground">Pick a soundscape, or paste any YouTube link — the audio keeps playing while you focus.</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {PRESETS.map(({ label, id, icon: Icon }) => (
          <button key={label} type="button" onClick={() => playId(id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all duration-150 ${videoId === id ? 'border-accent/30 bg-accent/12 text-accent' : 'border-border/80 text-muted-foreground hover:border-accent/40 hover:text-foreground'}`} data-testid={`focus-preset-${label.toLowerCase()}`}><Icon size={12} />{label}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
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
        <button type="button" onClick={apply} className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-transform duration-150 hover:-translate-y-0.5" data-testid="button-focus-music-apply">Play</button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-accent" data-testid="focus-music-error">{error}</p>}
      {videoId ? (
        <div className="mt-3">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border/70 bg-sidebar" data-testid="iframe-focus-music">
            <div id="focus-music-player" className="absolute inset-0" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button type="button" onClick={toggle} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground transition-[transform,background-color] duration-150 hover:-translate-y-0.5" data-testid="button-focus-music-toggle">
              <span className="relative inline-flex h-[11px] w-[11px] items-center justify-center">
                <Play size={11} fill="currentColor" className={`absolute transition-all duration-200 ease-out ${playing ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
                <Pause size={11} className={`absolute transition-all duration-200 ease-out ${playing ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`} />
              </span>
              {playing ? 'Pause' : 'Play'}
            </button>
            <p className="min-w-0 flex-1 truncate text-center font-mono-custom text-[9px] uppercase tracking-[.14em] text-muted-foreground/70">{title ?? 'Saved on this device'}</p>
            <button type="button" onClick={clear} className="flex items-center gap-1 rounded-lg border border-border/80 px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid="button-focus-music-clear"><X size={11} /> Remove</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Volume2 size={13} className="shrink-0 text-muted-foreground/60" />
            <input type="range" min={0} max={100} value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="h-1.5 w-full cursor-pointer accent-[hsl(var(--primary))]" aria-label="Music volume" data-testid="input-focus-music-volume" />
            <span className="w-7 shrink-0 text-right font-mono-custom text-[9px] text-muted-foreground/60">{volume}</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground/70">Nothing set yet — music stays on this device only.</p>
      )}
    </Card>
  );
}
