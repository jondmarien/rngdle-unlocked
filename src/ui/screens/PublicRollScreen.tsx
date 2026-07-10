import { useEffect, useState } from 'react';
import { buildShareText } from '../../game/shareText';
import type { RollResult } from '../../game/types';
import { createLogger } from '../../lib/logger';
import { fetchPublicRoll, type PublicRollDto } from '../../lib/roll-api';
import { useGame } from '../../state/GameProvider';
import { BadgeBreakdown } from '../components/BadgeCard';
import { EPPill } from '../components/EPPill';
import { RarityBadge } from '../components/RarityBadge';

const log = createLogger('public-roll');

type PublicRoll = PublicRollDto & {
  source: 'cloud' | 'local';
};

export function PublicRollScreen({
  rollId,
  username: routeUser,
  onOpenProfile,
  onBack,
}: {
  /** UUID or short vanity code */
  rollId: string;
  username?: string;
  onOpenProfile: (username: string) => void;
  onBack?: () => void;
}) {
  const { history } = useGame();
  const [roll, setRoll] = useState<PublicRoll | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRoll(null);
    log.info('load', { rollId, routeUser });

    fetchPublicRoll(rollId, routeUser)
      .then((cloudRoll) => {
        if (!cancelled) {
          setRoll({ ...cloudRoll, source: 'cloud' });
          log.info('loaded from cloud', { rollId });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        // Same-browser fallback: roll may only exist in localStorage
        const local = history.find(
          (h) => h.id === rollId || h.shortCode === rollId,
        );
        if (local) {
          log.info('loaded from local history', { rollId });
          setRoll({
            id: local.id,
            shortCode: local.shortCode,
            number: local.number,
            totalEP: local.totalEP,
            rarity: local.rarity,
            percentile: local.percentile,
            badges: local.badges,
            rolledAt: local.rolledAt,
            player: { username: routeUser ?? null, name: 'You (local)' },
            source: 'local',
          });
          return;
        }
        log.warn('not found', {
          rollId,
          err: e instanceof Error ? e.message : String(e),
        });
        setError(
          e instanceof Error
            ? `${e.message}. Cloud public rolls need an account + cloud sync. Local-only rolls only open on this device.`
            : 'Failed',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [rollId, routeUser, history]);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="text-xs text-(--prose-3)">
          Tip: sign in → Account → Push / merge to cloud, then re-share. Public
          links use the cloud copy of the roll.
        </p>
        {onBack && (
          <button type="button" className="text-xs underline" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    );
  }
  if (!roll) {
    return <p className="text-sm text-(--prose-3)">Loading roll…</p>;
  }

  const asResult: RollResult = {
    id: roll.id,
    shortCode: roll.shortCode ?? undefined,
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

  const share = buildShareText(asResult, {
    username: roll.player.username ?? routeUser,
  });

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          type="button"
          className="text-xs uppercase underline"
          onClick={onBack}
        >
          ← Back
        </button>
      )}

      {roll.source === 'local' && (
        <p className="rounded border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Showing local copy — push to cloud so others can open this link.
        </p>
      )}

      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-(--prose-3)">
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
          {!roll.player.username && roll.player.name && (
            <> · {roll.player.name}</>
          )}
        </p>
        <div className="mt-4 font-mono text-4xl font-bold tracking-wider">
          {roll.number}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <RarityBadge rarity={roll.rarity} />
          <EPPill ep={roll.totalEP} />
        </div>
      </div>

      <BadgeBreakdown badges={roll.badges ?? []} number={roll.number} />

      <button
        type="button"
        className="w-full border border-(--outline) px-3 py-2 text-xs font-bold uppercase"
        onClick={async () => {
          await navigator.clipboard.writeText(share);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied!' : 'Copy Discord share'}
      </button>
    </div>
  );
}
