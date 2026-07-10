import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ARCADE_UPGRADES, type ArcadeUpgradeId } from '../../game/arcade';
import { useSession } from '../../lib/auth-client';
import {
  abandonArcadeRun,
  arcadeRoll,
  armArcadeActive,
  buyArcadeUpgrade,
  cashOutArcadeRun,
  fetchArcadeState,
  startArcadeRun,
  type ArcadeMeta,
  type ArcadeRoll,
  type ArcadeRun,
} from '../../lib/arcade-api';
import { QueryErrorBanner } from '../components/QueryErrorBanner';
import { RarityBadge } from '../components/RarityBadge';
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
  const qc = useQueryClient();
  const [lastRoll, setLastRoll] = useState<ArcadeRoll | null>(null);
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
    mutationFn: (opts?: { useReroll?: boolean }) => arcadeRoll(opts),
    onSuccess: (data) => {
      setLastRoll(data.roll);
      qc.setQueryData(['arcade-state'], {
        meta: data.meta,
        activeRun: data.busted ? null : data.run,
        usernameRequired: false,
      });
      if (data.busted) {
        setEndBanner(
          data.donResult === 'lose'
            ? `Busted on Double or Nothing. Run score: ${data.run.runScore?.toLocaleString() ?? 0} Digits (peak).`
            : `Run ended. Score: ${data.run.runScore?.toLocaleString() ?? 0}`,
        );
        invalidate();
      } else if (data.donResult === 'win') {
        setEndBanner('Double or Nothing hit — Digits doubled!');
      } else {
        setEndBanner(null);
      }
    },
  });

  const buyMut = useMutation({
    mutationFn: buyArcadeUpgrade,
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
          className="rounded-md border border-(--prose) bg-(--prose) px-3 py-2 text-sm font-semibold text-(--bg)"
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
          <button type="button" className="underline" onClick={onGoLeaderboard}>
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
          <button type="button" className="underline" onClick={onGoAccount}>
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
                className="rounded-md border border-(--prose) bg-(--prose) px-4 py-2 text-sm font-bold text-(--bg) disabled:opacity-40"
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--prose-3)">
                      Digits
                    </p>
                    <p className="mono-number text-3xl font-bold text-amber-500">
                      {run.digits.toLocaleString()}
                    </p>
                    <p className="text-xs text-(--prose-3)">
                      Peak {run.peakDigits.toLocaleString()} · Roll #
                      {run.rollCount}
                      {run.comboStreak > 0 ? ` · Combo ${run.comboStreak}` : ''}
                      {run.surgeRollsRemaining > 0
                        ? ` · Surge ×${run.surgeRollsRemaining}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border border-(--prose) bg-(--prose) px-3 py-2 text-sm font-bold text-(--bg) disabled:opacity-40"
                      onClick={() => rollMut.mutate({})}
                    >
                      Roll
                    </button>
                    <button
                      type="button"
                      disabled={busy || run.digits <= 0}
                      className="rounded-md border border-(--outline) px-3 py-2 text-sm font-semibold disabled:opacity-40"
                      onClick={() => cashMut.mutate()}
                    >
                      Cash out
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border border-red-500/50 px-3 py-2 text-sm font-semibold text-red-400 disabled:opacity-40"
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
                      Abandon
                    </button>
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
                <div className="rounded-lg border border-(--outline) px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="mono-number text-2xl font-bold">
                        {lastRoll.number.toLocaleString()}
                      </p>
                      <p className="text-sm text-(--prose-2)">
                        +{lastRoll.digitsAwarded.toLocaleString()} Digits ·{' '}
                        {lastRoll.totalEP.toLocaleString()} EP (Arcade only)
                      </p>
                    </div>
                    <RarityBadge rarity={lastRoll.rarity} />
                  </div>
                </div>
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
                      return (
                        <li
                          key={id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-(--outline) px-3 py-2 text-sm"
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
                      const def = ARCADE_UPGRADES[offer.upgradeId];
                      const canBuy = run.digits >= offer.price;
                      return (
                        <li
                          key={offer.upgradeId}
                          className="flex flex-col rounded-md border border-(--outline) px-3 py-2 text-sm"
                        >
                          <span className="font-semibold">{def.name}</span>
                          <span className="text-xs text-(--prose-3)">
                            {def.type}
                          </span>
                          <p className="mt-1 flex-1 text-xs text-(--prose-2)">
                            {def.description}
                          </p>
                          <button
                            type="button"
                            disabled={busy || !canBuy}
                            className="mt-2 rounded-md border border-(--prose) px-2 py-1.5 text-xs font-bold disabled:opacity-40"
                            onClick={() => buyMut.mutate(offer.upgradeId)}
                          >
                            Buy · {offer.price} Digits
                          </button>
                        </li>
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
