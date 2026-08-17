import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'pp-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDismissed(true);
      localStorage.setItem(DISMISS_KEY, '1');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || isStandalone()) return null;
  const showIos = isIOS() && !installEvent;
  if (!installEvent && !showIos) return null;

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!installEvent) return;
    setInstalling(true);
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstalling(false);
    setInstallEvent(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 md:inset-x-auto md:right-4 md:bottom-4 md:max-w-sm" data-testid="install-prompt">
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-white"><Download size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Install Ledger</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {installEvent
                ? 'Add Ledger to your home screen for offline access and a full-screen experience.'
                : 'Add Ledger to your iPhone. Tap Share, then Add to Home Screen.'}
            </p>
            {showIos && showIosSteps && (
              <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><Share size={11} className="shrink-0" /> Tap the Share button in Safari's toolbar</li>
                <li className="flex items-center gap-1.5">Scroll down and tap <span className="font-semibold text-foreground">Add to Home Screen</span></li>
                <li className="flex items-center gap-1.5">Tap <span className="font-semibold text-foreground">Add</span> — Ledger opens full-screen from your home screen</li>
              </ol>
            )}
            {showIos && !showIosSteps && (
              <button type="button" onClick={() => setShowIosSteps(true)} className="mt-1 text-xs font-semibold text-primary hover:underline" data-testid="button-ios-steps">
                Show how
              </button>
            )}
          </div>
          <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary" data-testid="button-dismiss-install"><X size={15} /></button>
        </div>
        {installEvent && (
          <button type="button" onClick={install} disabled={installing} className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50" data-testid="button-install-app">
            {installing ? 'Installing…' : 'Install'}
          </button>
        )}
      </div>
    </div>
  );
}