import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ensureShortCode, topPercentFromEP, type RollResult } from '../../game';
import { buildRollShareUrl, buildShareText } from '../../game/shareText';
import { useSession } from '../../lib/auth-client';
import { createLogger } from '../../lib/logger';
import { vanityRollPath } from '../../lib/routes';
import { useCloudSync } from '../../state/GameProvider';
import { RarityBadge } from './RarityBadge';
import { EPPill } from './EPPill';

export { buildShareText } from '../../game/shareText';

const log = createLogger('share-panel');

type PublishState = 'checking' | 'ready' | 'error' | 'logged-out';

export function SharePanel({
  roll,
  rollCount,
  showRollCount,
  onClose,
  onGoAccount,
}: {
  roll: RollResult;
  rollCount: number;
  showRollCount: boolean;
  onClose: () => void;
  onGoAccount?: () => void;
}) {
  const { data: session } = useSession();
  const { waitForCloudPublish, syncing } = useCloudSync();
  const username = session?.user.username ?? null;
  const loggedIn = Boolean(session?.user);
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [publish, setPublish] = useState<PublishState>(
    loggedIn ? 'checking' : 'logged-out',
  );

  const rollWithCode = ensureShortCode(roll);
  const publicPath = vanityRollPath(username, rollWithCode.shortCode!);
  const fullUrl = buildRollShareUrl(rollWithCode, { username });

  const includePublicLink = loggedIn && publish === 'ready';
  const text = buildShareText(rollWithCode, {
    showRollCount,
    rollCount,
    username,
    includePublicLink,
  });

  useEffect(() => {
    if (!loggedIn) {
      setPublish('logged-out');
      return;
    }
    let cancelled = false;
    setPublish('checking');
    log.info('publish:wait', { rollId: roll.id });
    void waitForCloudPublish(rollWithCode).then((result) => {
      if (cancelled) return;
      if (result === 'ok') setPublish('ready');
      else if (result === 'logged-out') setPublish('logged-out');
      else setPublish('error');
      log.info('publish:result', { result });
    });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, roll.id, rollWithCode.shortCode, waitForCloudPublish]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      log.info('copied share text', {
        rollId: roll.id,
        includePublicLink,
      });
      setStatus(
        includePublicLink
          ? 'Copied for Discord!'
          : 'Copied roll text (no public link).',
      );
    } catch {
      setStatus('Could not copy — select the text manually.');
    }
  };

  const renderPngDataUrl = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor:
        getComputedStyle(document.documentElement)
          .getPropertyValue('--surface')
          .trim() || '#fff',
    });
  };

  const dataUrlToPngBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const downloadPng = async () => {
    try {
      const dataUrl = await renderPngDataUrl();
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.download = `rngdle-unlocked-${roll.number}.png`;
      a.href = dataUrl;
      a.click();
      setStatus('PNG downloaded.');
    } catch {
      setStatus('PNG failed — text copy still works.');
    }
  };

  const copyPng = async () => {
    try {
      const dataUrl = await renderPngDataUrl();
      if (!dataUrl) return;
      const blob = await dataUrlToPngBlob(dataUrl);
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        setStatus('Copy PNG not supported here — use Download PNG.');
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      log.info('copied share png', { rollId: roll.id });
      setStatus('PNG copied — paste into Discord or chat.');
    } catch {
      setStatus('Could not copy PNG — try Download PNG instead.');
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

        {publish === 'logged-out' && (
          <div className="mb-4 space-y-2 rounded-lg border border-[var(--outline)] bg-[var(--bg)] p-3 text-sm">
            <p className="text-[var(--prose)]">
              If you would like a <strong>public share link</strong>, please
              create an account so rolls sync to the cloud.
            </p>
            <p className="text-xs text-[var(--prose-3)]">
              You can still copy Discord-style roll text below (without a URL).
            </p>
            {onGoAccount && (
              <button
                type="button"
                className="border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-1.5 text-xs font-bold uppercase text-[var(--bg)]"
                onClick={() => {
                  onClose();
                  onGoAccount();
                }}
              >
                Create account / sign in
              </button>
            )}
          </div>
        )}

        {publish === 'checking' && (
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
            {syncing ? 'Publishing to cloud…' : 'Waiting for cloud…'}
          </p>
        )}

        {publish === 'error' && (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">
            Could not confirm cloud publish yet. Try Account → Push, then share
            again.
          </p>
        )}

        {includePublicLink && (
          <>
            <p className="mb-2 text-xs text-[var(--prose-3)]">
              Public vanity link:
            </p>
            <p className="mb-3 break-all font-mono text-[11px] text-[var(--prose)]">
              {fullUrl}
            </p>
            <p className="mb-2 text-[10px] text-[var(--prose-3)]">
              Path: <code>{publicPath}</code>
              {!username && ' · set @username for your handle in the URL'}
            </p>
          </>
        )}

        {publish === 'checking' && loggedIn && (
          <p className="mb-3 break-all font-mono text-[11px] text-[var(--prose-3)] opacity-50">
            {fullUrl}
          </p>
        )}

        <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--outline)] bg-[#1e1f22] p-4 text-left font-mono text-[13px] leading-relaxed text-[#dbdee1]">
          {text}
        </pre>

        <div className="mb-4 grid grid-cols-4 gap-1.5">
          <button
            type="button"
            className="border-2 border-[var(--prose)] bg-[var(--prose)] px-1.5 py-2 text-[10px] font-bold uppercase leading-tight text-[var(--bg)] sm:text-xs"
            onClick={() => void copyText()}
          >
            Copy for Discord
          </button>
          <button
            type="button"
            className="border border-[var(--prose)] px-1.5 py-2 text-[10px] font-bold uppercase leading-tight sm:text-xs"
            onClick={() => void nativeShare()}
          >
            Share…
          </button>
          <button
            type="button"
            className="border border-[var(--prose)] px-1.5 py-2 text-[10px] font-bold uppercase leading-tight sm:text-xs"
            onClick={() => void copyPng()}
          >
            Copy PNG
          </button>
          <button
            type="button"
            className="border border-[var(--prose)] px-1.5 py-2 text-[10px] font-bold uppercase leading-tight sm:text-xs"
            onClick={() => void downloadPng()}
          >
            Download PNG
          </button>
        </div>

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
            Top {topPercentFromEP(roll.totalEP)}% of roll scores
          </p>
          <div className="flex flex-wrap justify-center gap-1 pt-2">
            {roll.badges
              .slice()
              .sort((a, b) => b.ep - a.ep)
              .map((b) => (
                <span
                  key={b.id}
                  className="rounded bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] uppercase"
                >
                  {b.emoji} {b.name}
                </span>
              ))}
          </div>
          {roll.badges.length > 0 && (
            <p className="pt-1 text-[10px] text-[var(--prose-3)]">
              {roll.badges.length} badge
              {roll.badges.length === 1 ? '' : 's'} · full list above in share
              text
            </p>
          )}
        </div>

        {status && (
          <p className="mt-2 text-xs text-[var(--prose-3)]">{status}</p>
        )}
      </div>
    </div>
  );
}
