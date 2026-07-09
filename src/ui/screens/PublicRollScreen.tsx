import { useEffect, useState } from 'react';
import { buildShareText } from '../../game/shareText';
import type { BadgeHit, RarityTier, RollResult } from '../../game/types';
import { BadgeBreakdown } from '../components/BadgeCard';
import { EPPill } from '../components/EPPill';
import { RarityBadge } from '../components/RarityBadge';

type PublicRoll = {
  id: string;
  number: number;
  totalEP: number;
  rarity: RarityTier;
  percentile: number;
  badges: BadgeHit[];
  rolledAt: string;
  player: { username: string | null; name: string };
};

export function PublicRollScreen({
  rollId,
  onOpenProfile,
  onBack,
}: {
  rollId: string;
  onOpenProfile: (username: string) => void;
  onBack?: () => void;
}) {
  const [roll, setRoll] = useState<PublicRoll | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rolls/${encodeURIComponent(rollId)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Not found');
        if (!cancelled) setRoll(data.roll);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
      });
    return () => {
      cancelled = true;
    };
  }, [rollId]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        {onBack && (
          <button type="button" className="text-xs underline" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    );
  }
  if (!roll) {
    return <p className="text-sm text-[var(--prose-3)]">Loading roll…</p>;
  }

  const asResult: RollResult = {
    id: roll.id,
    number: roll.number,
    totalEP: roll.totalEP,
    rarity: roll.rarity,
    percentile: roll.percentile,
    badges: roll.badges ?? [],
    rolledAt:
      typeof roll.rolledAt === 'string'
        ? roll.rolledAt
        : new Date(roll.rolledAt).toISOString(),
  };

  const share = buildShareText(asResult);

  return (
    <div className="space-y-6">
      {onBack && (
        <button type="button" className="text-xs uppercase underline" onClick={onBack}>
          ← Back
        </button>
      )}

      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-[var(--prose-3)]">
          Shared roll
          {roll.player.username && (
            <>
              {' '}
              by{' '}
              <button
                type="button"
                className="font-bold underline"
                onClick={() =>
                  roll.player.username && onOpenProfile(roll.player.username)
                }
              >
                @{roll.player.username}
              </button>
            </>
          )}
        </p>
        <div className="mono-number mt-2 text-5xl font-bold">
          {roll.number.toLocaleString()}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <RarityBadge rarity={roll.rarity} />
          <EPPill ep={roll.totalEP} />
        </div>
      </div>

      <button
        type="button"
        className="w-full border-2 border-[var(--prose)] bg-[var(--prose)] px-4 py-2 text-xs font-bold uppercase text-[var(--bg)]"
        onClick={async () => {
          await navigator.clipboard.writeText(share);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? 'Copied!' : 'Copy Discord share'}
      </button>

      <BadgeBreakdown badges={roll.badges ?? []} number={roll.number} />
    </div>
  );
}
