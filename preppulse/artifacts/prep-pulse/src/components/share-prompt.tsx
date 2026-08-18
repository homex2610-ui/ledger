import { useEffect, useRef } from 'react';
import { Share2, X } from 'lucide-react';
import { useRecordSharePromptEvent } from '@workspace/api-client-react';

export function SharePrompt({ minutes, onShare, onDismiss }: { minutes: number; onShare: () => void; onDismiss: () => void }) {
  const recordEvent = useRecordSharePromptEvent();
  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    recordEvent.mutate({ data: { event: 'share_prompt_viewed' } });
  }, [recordEvent]);

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 md:bottom-6" data-testid="share-prompt">
      <div className="rounded-2xl border border-primary/25 bg-[#0B3D33] p-4 text-[#F5F1E6] shadow-[0_18px_48px_hsl(186_32%_16%/.3)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6CCBC0]/15 text-[#6CCBC0]"><Share2 size={15} /></span>
            <div>
              <p className="text-sm font-bold">{minutes} focused minutes — logged.</p>
              <p className="mt-0.5 text-xs text-[#F5F1E6]/65">Turn today's work into a card your circle can see.</p>
            </div>
          </div>
          <button type="button" onClick={onDismiss} className="rounded-lg p-1.5 text-[#F5F1E6]/55 transition-colors hover:bg-white/10" aria-label="Maybe later" data-testid="button-share-dismiss"><X size={15} /></button>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onShare} className="flex-1 rounded-xl bg-[#F0645A] px-4 py-2.5 text-xs font-bold text-[#0B3D33] transition-transform hover:-translate-y-0.5" data-testid="button-share-now">Share my focus card</button>
          <button type="button" onClick={onDismiss} className="rounded-xl border border-[#F5F1E6]/20 px-4 py-2.5 text-xs font-bold text-[#F5F1E6]/80 hover:bg-white/10" data-testid="button-share-later">Maybe later</button>
        </div>
      </div>
    </div>
  );
}