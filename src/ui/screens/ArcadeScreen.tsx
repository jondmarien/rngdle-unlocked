import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ARCADE_UPGRADES, type ArcadeUpgradeId } from '../../game/arcade';
import {
  celebrateIntensity,
  playAbandonSound,
  playArcadeRollSound,
  playCashOutSound,
  playDigitsGainSound,
  playPurchaseSound,
} from '../../game';
import { useSession } from '../../lib/auth-client';
import {
  abandonArcadeRun,
  ARCADE_ROLL_COUNTS,
  arcadeRoll,
  armArcadeActive,
  buyArcadeUpgrade,
  cashOutArcadeRun,
  fetchArcadeState,
  startArcadeRun,
  type ArcadeMeta,
  type ArcadeRoll,
  type ArcadeRollCount,
  type ArcadeRun,
} from '../../lib/arcade-api';
import { ARCADE_RISK_ICON, ARCADE_SHOP_TEXTURE } from '../../lib/arcade-icons';
import { useGame, useGameSettings } from '../../state/GameProvider';
import { ArcadeComboChip } from '../components/arcade/ArcadeComboChip';
import { ArcadeDeadlineChip } from '../components/arcade/ArcadeDeadlineChip';
import { ArcadeDigitsDisplay } from '../components/arcade/ArcadeDigitsDisplay';
import { ArcadeRollReveal } from '../components/arcade/ArcadeRollReveal';
import { ArcadeShopCard } from '../components/arcade/ArcadeShopCard';
import { QueryErrorBanner } from '../components/QueryErrorBanner';
import { SegmentedToggle } from '../components/SegmentedToggle';

function upgradeLabel(id: ArcadeUpgradeId): string {
  return ARCADE_UPGRADES[id]?.name ?? id;
}

function cooldownLabel(run: ArcadeRun, id: ArcadeUpgradeId): string {
  const n = run.cooldowns[id] ?? 0;
  if (n <= 0) return 'Ready';
  return `${n} roll${n === 1 ? '' : 's'}`;
}

export function ArcadeScreen({
  onGoAccount,
  onGoLeaderboard,
}: {
  onGoAccount: () => void;
  onGoLeaderboard: () => void;
}) {
  const { data: session } = useSession();
  const { settings } = useGameSettings();
  const { fireCelebration, clearCelebration } = useGame();
  const soundOn = settings.soundEnabled;
  const qc = useQueryClient();
  const [lastRoll, setLastRoll] = useState<ArcadeRoll | null>(null);
  const [lastBatchSize, setLastBatchSize] = useState(1);
  const [revealKey, setRevealKey] = useState(0);
  const [justBoughtId, setJustBoughtId] = useState<ArcadeUpgradeId | null>(
    null,
  );
  const [rollCount, setRollCount] = useState<ArcadeRollCount>(1);
  const [endBanner, setEndBanner] = useState<string | null>(null);
  const [panel, setPanel] = useState<'run' | 'meta'>('run');

  const stateQuery = useQuery({
    queryKey: ['arcade-state'],
    queryFn: ({ signal }) => fetchArcadeState(signal),
    enabled: Boolean(session?.user),
  });

  const meta: ArcadeMeta | null = stateQuery.data?.meta ?? null;
  const run: ArcadeRun | null = stateQuery.data?.activeRun ?? null;
  const usernameRequired = stateQuery.data?.usernameRequired ?? false;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['arcade-state'] });
    void qc.invalidateQueries({ queryKey: ['arcade-leaderboard'] });
  };

  const startMut = useMutation({
    mutationFn: startArcadeRun,
    onSuccess: (data) => {
      setLastRoll(null);
      setEndBanner(null);
      qc.setQueryData(['arcade-state'], {
        meta: data.meta,
        activeRun: data.run,
        usernameRequired: false,
      });
    },
    onError: (err: Error & { run?: ArcadeRun }) => {
      if (err.run) {
        qc.setQueryData(['arcade-state'], (prev: unknown) => {
          const p = prev as
            | {
                meta: ArcadeMeta;
                activeRun: ArcadeRun | null;
                usernameRequired: boolean;
              }
            | undefined;
          return {
            meta: p?.meta ?? meta!,
            activeRun: err.run!,
            usernameRequired: false,
          };
        });
      }
    },
  });

  const rollMut = useMutation({
    mutationFn: (opts?: { useReroll?: boolean; count?: ArcadeRollCount }) =>
      arcadeRoll(opts),
    onMutate: () => {
      clearCelebration();
    },
    onSuccess: (data) => {
      setLastRoll(data.roll);
      setLastBatchSize(data.rolls.length);
      setRevealKey((k) => k + 1);
      playArcadeRollSound(data.roll.rarity, soundOn);
      if (!data.busted && data.roll.digitsAwarded > 0) {
        playDigitsGainSound(soundOn);
      }
      if (data.busted) {
        playAbandonSound(soundOn);
      }
      // Epic→Divine: same CelebrationLayer shake (+ confetti/edge) as Home.
      // Rare keeps art-only punch; Common stays quiet.
      const intensity = celebrateIntensity(data.roll.rarity);
      if (
        settings.confettiEnabled &&
        typeof intensity === 'number' &&
        intensity >= 2
      ) {
        fireCelebration(data.roll.rarity);
      }
      qc.setQueryData(['arcade-state'], {
        meta: data.meta,
        activeRun: data.busted ? null : data.run,
        usernameRequired: false,
      });
      if (data.busted) {
        const multi =
          data.rolls.length > 1 ? ` After ${data.rolls.length} of batch.` : '';
        setEndBanner(
          data.donResult === 'lose'
            ? `Busted on Double or Nothing. Run score: ${data.run.runScore?.toLocaleString() ?? 0} Digits (peak).${multi}`
            : `Run ended. Score: ${data.run.runScore?.toLocaleString() ?? 0}${multi}`,
        );
        invalidate();
      } else if (data.donResult === 'win') {
        setEndBanner('Double or Nothing hit — Digits doubled!');
      } else if (data.rolls.length > 1) {
        const gained = data.rolls.reduce((s, r) => s + r.digitsAwarded, 0);
        setEndBanner(
          `Rolled ×${data.rolls.length} — +${gained.toLocaleString()} Digits this batch.`,
        );
      } else {
        setEndBanner(null);
      }
    },
  });

  const buyMut = useMutation({
    mutationFn: buyArcadeUpgrade,
    onSuccess: (data, upgradeId) => {
      playPurchaseSound(soundOn);
      setJustBoughtId(upgradeId as ArcadeUpgradeId);
      window.setTimeout(() => setJustBoughtId(null), 600);
      qc.setQueryData(['arcade-state'], (prev: unknown) => {
        const p = prev as
          | {
              meta: ArcadeMeta;
              activeRun: ArcadeRun | null;
              usernameRequired: boolean;
            }
          | undefined;
        return {
          meta: p?.meta ?? meta!,
          activeRun: data.run,
          usernameRequired: false,
        };
      });
    },
  });

  const armMut = useMutation({
    mutationFn: armArcadeActive,
    onSuccess: (data) => {
      qc.setQueryData(['arcade-state'], (prev: unknown) => {
        const p = prev as
          | {
              meta: ArcadeMeta;
              activeRun: ArcadeRun | null;
              usernameRequired: boolean;
            }
          | undefined;
        return {
          meta: p?.meta ?? meta!,
          activeRun: data.run,
          usernameRequired: false,
        };
      });
    },
  });

  const cashMut = useMutation({
    mutationFn: cashOutArcadeRun,
    onSuccess: (data) => {
      playCashOutSound(soundOn);
      setEndBanner(
        `Cashed out for ${data.run.runScore?.toLocaleString() ?? 0} Digits.`,
      );
      qc.setQueryData(['arcade-state'], {
        meta: data.meta,
        activeRun: null,
        usernameRequired: false,
      });
      invalidate();
    },
  });

  const abandonMut = useMutation({
    mutationFn: abandonArcadeRun,
    onSuccess: (data) => {
      playAbandonSound(soundOn);
      setEndBanner(
        `Abandoned. Run score: ${data.run.runScore?.toLocaleString() ?? 0} Digits (peak).`,
      );
      qc.setQueryData(['arcade-state'], {
        meta: data.meta,
        activeRun: null,
        usernameRequired: false,
      });
      invalidate();
    },
  });

  const busy =
    startMut.isPending ||
    rollMut.isPending ||
    buyMut.isPending ||
    armMut.isPending ||
    cashMut.isPending ||
    abandonMut.isPending;

  const mutErr =
    startMut.error?.message ||
    rollMut.error?.message ||
    buyMut.error?.message ||
    armMut.error?.message ||
    cashMut.error?.message ||
    abandonMut.error?.message ||
    null;
  const stateErr =
    stateQuery.error instanceof Error ? stateQuery.error.message : null;

  if (!session?.user) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Arcade Mode
        </h1>
        <p className="text-sm text-(--prose-2)">
          Sign in and claim a public @username to start a Digits run. Arcade is
          separate from EP — Free, Daily, and Ranked are unchanged.
        </p>
        <button
          type="button"
          className="rounded-md border border-(--accent) bg-(--accent) px-3 py-2 text-sm font-semibold text-(--bg)"
          onClick={onGoAccount}
        >
          Go to Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Arcade Mode
        </h1>
        <p className="text-sm text-(--prose-2)">
          Roguelite runs with <strong className="text-(--prose)">Digits</strong>{' '}
          — buy upgrades between rolls, cash out or bust on Double or Nothing.
          Digits never convert to EP.{' '}
          <button
            type="button"
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            onClick={onGoLeaderboard}
          >
            Arcade board
          </button>
        </p>
      </div>

      <SegmentedToggle
        options={[
          { id: 'run', label: 'Run' },
          { id: 'meta', label: 'Meta' },
        ]}
        value={panel}
        onChange={setPanel}
      />

      {usernameRequired && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Claim a public @username on Account before starting Arcade (required
          for the board).{' '}
          <button
            type="button"
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            onClick={onGoAccount}
          >
            Account
          </button>
        </p>
      )}

      {stateErr && (
        <QueryErrorBanner
          message={stateErr}
          onRetry={() => void stateQuery.refetch()}
        />
      )}
      {mutErr && (
        <p className="text-sm text-red-400" role="alert">
          {mutErr}
        </p>
      )}

      {endBanner && (
        <div className="rounded-lg border-2 border-(--accent) bg-(--surface-raised) px-3 py-3 text-sm">
          <p className="font-semibold">{endBanner}</p>
          {meta?.newlyUnlocked && meta.newlyUnlocked.length > 0 && (
            <p className="mt-1 text-(--prose-2)">
              Unlocked:{' '}
              {meta.newlyUnlocked.map((id) => upgradeLabel(id)).join(', ')}
            </p>
          )}
        </div>
      )}

      {panel === 'meta' && meta && (
        <div className="space-y-3 rounded-lg border border-(--outline) bg-(--surface) px-3 py-3 text-sm">
          <p>
            Best run:{' '}
            <strong className="text-amber-500">
              {meta.bestRunScore.toLocaleString()} Digits
            </strong>
          </p>
          <p>
            Runs completed: {meta.totalRunsCompleted.toLocaleString()} ·
            Lifetime cashed: {meta.lifetimeDigitsCashed.toLocaleString()}
          </p>
          <div>
            <p className="mb-1 font-semibold">Unlocked shop pool</p>
            <ul className="space-y-1 text-(--prose-2)">
              {meta.unlockedUpgrades.map((id) => (
                <li key={id}>
                  <span className="text-(--prose)">{upgradeLabel(id)}</span>
                  {' — '}
                  {ARCADE_UPGRADES[id].description}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-(--prose-3)">
            Coming later (not in v1): debt/deadline pressure, idle Digits, trash
            streak soft-fail.
          </p>
        </div>
      )}

      {panel === 'run' && (
        <>
          {stateQuery.isPending && (
            <p className="text-sm text-(--prose-2)">Loading…</p>
          )}

          {!run && !stateQuery.isPending && (
            <div className="space-y-3 rounded-lg border border-(--outline) px-3 py-4">
              <p className="text-sm text-(--prose-2)">
                No active run. Start one to earn Digits, buy upgrades, and chase
                a high score.
              </p>
              <button
                type="button"
                disabled={busy || usernameRequired}
                className="rounded-md border border-(--accent) bg-(--accent) px-4 py-2 text-sm font-bold text-(--bg) disabled:opacity-40"
                onClick={() => startMut.mutate()}
              >
                Start run
              </button>
            </div>
          )}

          {run && run.status === 'active' && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-(--accent) bg-(--surface-raised) px-3 py-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <ArcadeDigitsDisplay
                      value={run.digits}
                      pulseStakes={run.digits > 0}
                    />
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--prose-3)">
                      <span>
                        Peak {run.peakDigits.toLocaleString()} · Roll #
                        {run.rollCount}
                      </span>
                      <ArcadeComboChip streak={run.comboStreak} />
                      <ArcadeDeadlineChip
                        digits={run.digits}
                        target={run.deadlineTargetDigits ?? 0}
                        rollsRemaining={run.deadlineRollsRemaining ?? 0}
                      />
                      {run.surgeRollsRemaining > 0 ? (
                        <span>· Surge ×{run.surgeRollsRemaining}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <SegmentedToggle
                      aria-label="Arcade roll multiplier"
                      value={String(rollCount)}
                      onChange={(id) =>
                        setRollCount(Number(id) as ArcadeRollCount)
                      }
                      options={ARCADE_ROLL_COUNTS.map((n) => ({
                        id: String(n),
                        label: `×${n}`,
                      }))}
                      chipClassName="rounded-md border px-2 py-1 text-xs font-semibold"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-md border border-(--accent) bg-(--accent) px-3 py-2 text-sm font-bold text-(--bg) disabled:opacity-40"
                        onClick={() => rollMut.mutate({ count: rollCount })}
                      >
                        {rollCount === 1 ? 'Roll' : `Roll ×${rollCount}`}
                      </button>
                      <button
                        type="button"
                        disabled={busy || run.digits <= 0}
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold disabled:opacity-40 ${
                          run.digits > 0 && !busy ? 'arcade-btn-cash-out' : ''
                        }`}
                        onClick={() => cashMut.mutate()}
                      >
                        <img
                          src={ARCADE_RISK_ICON.cashOut}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 shrink-0 object-contain"
                          aria-hidden
                        />
                        Cash out
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className={`inline-flex items-center gap-2 rounded-md border border-red-500/50 px-3 py-2.5 text-sm font-semibold text-red-400 disabled:opacity-40 ${
                          !busy ? 'arcade-btn-abandon' : ''
                        }`}
                        onClick={() => {
                          const ok = window.confirm(
                            'Abandon this run? This ends the run at your peak Digits score. This cannot be undone.',
                          );
                          if (!ok) return;
                          const ok2 = window.confirm(
                            'Really abandon? Confirm again to end the run.',
                          );
                          if (ok2) abandonMut.mutate();
                        }}
                      >
                        <img
                          src={ARCADE_RISK_ICON.abandon}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 shrink-0 object-contain"
                          aria-hidden
                        />
                        Abandon
                      </button>
                    </div>
                  </div>
                </div>
                {(run.pending.donArmed || run.pending.rarityLockArmed) && (
                  <p className="mt-2 text-xs font-semibold text-amber-400">
                    {run.pending.donArmed &&
                      'Double or Nothing armed for next roll. '}
                    {run.pending.rarityLockArmed &&
                      'Rarity Lock armed for next roll.'}
                  </p>
                )}
              </div>

              {lastRoll && (
                <ArcadeRollReveal
                  number={lastRoll.number}
                  digitsAwarded={lastRoll.digitsAwarded}
                  totalEP={lastRoll.totalEP}
                  rarity={lastRoll.rarity}
                  batchSize={lastBatchSize}
                  revealKey={revealKey}
                />
              )}

              <div className="space-y-2">
                <h2 className="text-sm font-bold">Owned upgrades</h2>
                {run.ownedUpgrades.length === 0 ? (
                  <p className="text-sm text-(--prose-3)">
                    None yet — buy from the shop below.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {run.ownedUpgrades.map((id) => {
                      const def = ARCADE_UPGRADES[id];
                      const cd = run.cooldowns[id] ?? 0;
                      const ready = cd <= 0;
                      const texture =
                        def.type === 'active'
                          ? ARCADE_SHOP_TEXTURE.active
                          : ARCADE_SHOP_TEXTURE.passive;
                      const flash =
                        justBoughtId === id ? 'arcade-shop-card-buy' : '';
                      return (
                        <li
                          key={id}
                          className={`arcade-shop-card arcade-owned-card flex flex-wrap items-center justify-between gap-2 rounded-md border border-(--outline) px-3 py-2 text-sm ${flash}`}
                          style={{
                            ['--arcade-shop-bg' as string]: `url(${texture})`,
                          }}
                        >
                          <div>
                            <span className="font-semibold">{def.name}</span>
                            <span className="ml-2 text-xs uppercase text-(--prose-3)">
                              {def.type}
                            </span>
                            <p className="text-xs text-(--prose-2)">
                              {def.description}
                            </p>
                          </div>
                          {def.type === 'active' && (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  ready
                                    ? 'text-emerald-400'
                                    : 'text-(--prose-3)'
                                }`}
                              >
                                {cooldownLabel(run, id)}
                              </span>
                              {id === 'reroll' ? (
                                <button
                                  type="button"
                                  disabled={busy || !ready}
                                  className="rounded border border-(--outline) px-2 py-1 text-xs font-semibold disabled:opacity-40"
                                  onClick={() =>
                                    rollMut.mutate({ useReroll: true })
                                  }
                                >
                                  Reroll now
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy || !ready}
                                  className="rounded border border-(--outline) px-2 py-1 text-xs font-semibold disabled:opacity-40"
                                  onClick={() => {
                                    if (id === 'bonus_spin') {
                                      void (async () => {
                                        await armMut.mutateAsync(id);
                                        await rollMut.mutateAsync({});
                                      })();
                                      return;
                                    }
                                    armMut.mutate(id);
                                  }}
                                >
                                  {id === 'bonus_spin' ? 'Bonus spin' : 'Arm'}
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold">Shop</h2>
                {run.shopOffers.length === 0 ? (
                  <p className="text-sm text-(--prose-3)">
                    No offers (pool exhausted or sold out). Keep rolling.
                  </p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {run.shopOffers.map((offer) => {
                      const canBuy = run.digits >= offer.price;
                      return (
                        <ArcadeShopCard
                          key={offer.upgradeId}
                          upgradeId={offer.upgradeId}
                          price={offer.price}
                          canBuy={canBuy}
                          busy={busy}
                          onBuy={() => buyMut.mutate(offer.upgradeId)}
                        />
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
