import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { topPercentFromPercentile, type RollResult } from '../../game';
import { buildShareText } from '../../game/shareText';
import { RarityBadge } from './RarityBadge';
import { EPPill } from './EPPill';

export { buildShareText } from '../../game/shareText';

export function SharePanel({
  roll,
  rollCount,
  showRollCount,
  onClose,
}: {
  roll: RollResult;
  rollCount: number;
  showRollCount: boolean;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const text = buildShareText(roll, {
    showRollCount,
    rollCount,
  });

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied for Discord!');
    } catch {
      setStatus('Could not copy — select the text manually.');
    }
  };

  const downloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor:
          getComputedStyle(document.documentElement)
            .getPropertyValue('--surface')
            .trim() || '#fff',
      });
      const a = document.createElement('a');
      a.download = `rngdle-unlocked-${roll.number}.png`;
      a.href = dataUrl;
      a.click();
      setStatus('PNG downloaded.');
    } catch {
      setStatus('PNG failed — text copy still works.');
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      setStatus('Web Share not available — use Copy text for Discord.');
      return;
    }
    try {
      await navigator.share({ title: 'RNGdle Unlocked', text });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-[var(--outline)] bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider">Share</h2>
          <button
            type="button"
            className="text-[var(--prose-3)] hover:text-[var(--prose)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <p className="mb-2 text-xs text-[var(--prose-3)]">
          Discord-style text — copy and paste into a chat.
        </p>

        {/* Primary: Discord paste block */}
        <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--outline)] bg-[#1e1f22] p-4 text-left font-mono text-[13px] leading-relaxed text-[#dbdee1]">
          {text}
        </pre>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="border-2 border-[var(--prose)] bg-[var(--prose)] px-4 py-2 text-xs font-bold uppercase text-[var(--bg)]"
            onClick={copyText}
          >
            Copy for Discord
          </button>
          <button
            type="button"
            className="border border-[var(--prose)] px-3 py-2 text-xs font-bold uppercase"
            onClick={nativeShare}
          >
            Share…
          </button>
          <button
            type="button"
            className="border border-[var(--prose)] px-3 py-2 text-xs font-bold uppercase"
            onClick={downloadPng}
          >
            Download PNG
          </button>
        </div>

        {/* Secondary: visual card for PNG */}
        <div
          ref={cardRef}
          className="space-y-2 rounded-lg border border-[var(--outline)] bg-[var(--bg)] p-6 text-center"
        >
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--prose-3)]">
            RNGdle Unlocked 🎲
          </div>
          <div className="mono-number text-4xl font-bold">
            {roll.number.toLocaleString()}
          </div>
          <RarityBadge rarity={roll.rarity} />
          <div className="flex justify-center gap-2">
            <EPPill ep={roll.totalEP} />
          </div>
          <p className="text-xs text-[var(--prose-3)]">
            Top {topPercentFromPercentile(roll.percentile)}% of roll scores
          </p>
          <div className="flex flex-wrap justify-center gap-1 pt-2">
            {roll.badges.slice(0, 6).map((b) => (
              <span
                key={b.id}
                className="rounded bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] uppercase"
              >
                {b.emoji} {b.name}
              </span>
            ))}
          </div>
        </div>

        {status && (
          <p className="mt-2 text-xs text-[var(--prose-3)]">{status}</p>
        )}
      </div>
    </div>
  );
}
