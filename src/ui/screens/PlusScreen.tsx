import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  createCheckout,
  createTopupCheckout,
  openBillingPortal,
  type PaidRankedTier,
  type TopupSku,
} from '../../lib/checkout-api';
import { createLogger } from '../../lib/logger';
import { fetchMe } from '../../lib/me-api';
import type { RankedTier } from '../../lib/ranked-limits';
import { rankedRegenPerTick, rankedTierRank } from '../../lib/ranked-limits';
import {
  RANKED_PLUS_CATALOG,
  tierChipClass,
} from '../../lib/ranked-plus-catalog';
import {
  RANKED_TOPUP_CATALOG,
  TOPUP_NON_ROLLOVER,
} from '../../lib/ranked-topup-catalog';
import { fetchRankedQuota } from '../../lib/roll-api';
import { useIsAdmin } from '../../lib/useIsAdmin';

const log = createLogger('plus');

export function PlusScreen() {
  const { data: session, isPending } = useSession();
  const { isAdmin } = useIsAdmin(session?.user?.id);
  const [username, setUsername] = useState('');
  const [rankedTier, setRankedTier] = useState<RankedTier>('free');
  const [hasPolarBilling, setHasPolarBilling] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [highlightTier, setHighlightTier] = useState<PaidRankedTier | null>(
    null,
  );
  const [hasOverload, setHasOverload] = useState(false);
  const [topupPackBonus, setTopupPackBonus] = useState(0);
  const [quotaResetsInSec, setQuotaResetsInSec] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const rankedPlusRef = useRef<HTMLDivElement>(null);
  const topupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.debug('mount', { hasUser: Boolean(session?.user) });
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setUsername('');
      setRankedTier('free');
      setHasPolarBilling(false);
      return;
    }
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled || !data.user) return;
        if (data.user.username) setUsername(data.user.username);
        setRankedTier((data.user.rankedTier ?? 'free') as RankedTier);
        setHasPolarBilling(Boolean(data.user.hasPolarBilling));
        void fetchRankedQuota().then((q) => {
          if (cancelled || !q) return;
          setHasOverload(Boolean(q.hasOverload));
          setTopupPackBonus(q.packBonus ?? 0);
          setQuotaResetsInSec(q.resetsInSec);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Deep links: ?upgrade= · ?topup= · ?checkout=success|topup_success|cancel
  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user) return;
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get('upgrade');
    const topup = params.get('topup');
    const checkout = params.get('checkout');
    let dirty = false;

    if (upgrade === 'rare' || upgrade === 'epic' || upgrade === 'anomaly') {
      setHighlightTier(upgrade);
      rankedPlusRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      params.delete('upgrade');
      dirty = true;
    }

    if (topup === '1' || topup === 'true') {
      topupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      params.delete('topup');
      dirty = true;
    }

    if (checkout === 'cancel') {
      setMsg('Checkout cancelled — no charge. You can try again anytime.');
      params.delete('checkout');
      params.delete('tier');
      params.delete('sku');
      params.delete('checkout_id');
      dirty = true;
    }

    if (checkout === 'topup_success') {
      setMsg('Top-up received — raising this hour’s Ranked cap…');
      let tries = 0;
      const baselineBonus = topupPackBonus;
      const poll = window.setInterval(() => {
        tries += 1;
        void fetchRankedQuota()
          .then((q) => {
            if (!q) return;
            setHasOverload(Boolean(q.hasOverload));
            setTopupPackBonus(q.packBonus ?? 0);
            setQuotaResetsInSec(q.resetsInSec);
            if (
              (q.packBonus ?? 0) > baselineBonus ||
              q.hasOverload ||
              (q.topupBonus ?? 0) > 0 ||
              tries >= 8
            ) {
              window.clearInterval(poll);
              setMsg(
                `Top-up active — ${q.remaining}/${q.limit} Ranked rolls left this UTC hour.`,
              );
            }
          })
          .catch(() => {});
        if (tries >= 12) {
          window.clearInterval(poll);
          setMsg(
            'Payment received. If your hour cap did not rise yet, wait a moment and refresh.',
          );
        }
      }, 1200);
      params.delete('checkout');
      params.delete('sku');
      params.delete('checkout_id');
      dirty = true;
      if (dirty) {
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', next);
      }
      return () => window.clearInterval(poll);
    }

    if (checkout === 'success') {
      const wantTier = params.get('tier');
      setMsg('Payment received — unlocking Ranked Plus…');
      let tries = 0;
      const poll = window.setInterval(() => {
        tries += 1;
        void fetchMe()
          .then((data) => {
            if (!data.user) return;
            const tier = (data.user.rankedTier ?? 'free') as RankedTier;
            setRankedTier(tier);
            setHasPolarBilling(Boolean(data.user.hasPolarBilling));
            if (
              tier !== 'free' &&
              (!wantTier || tier === wantTier || tries >= 8)
            ) {
              window.clearInterval(poll);
              setMsg(
                `Ranked Plus · ${tier} is active. Frames and emblems are unlocked — save your look on Account.`,
              );
            }
          })
          .catch(() => {});
        if (tries >= 12) {
          window.clearInterval(poll);
          setMsg(
            'Payment received. If Ranked Plus is not active yet, wait a moment and refresh — webhooks can lag a few seconds.',
          );
        }
      }, 1200);
      params.delete('checkout');
      params.delete('tier');
      params.delete('checkout_id');
      dirty = true;
      if (dirty) {
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', next);
      }
      return () => window.clearInterval(poll);
    }

    const discordInstall = params.get('discord_install');
    if (discordInstall) {
      const messages: Record<string, string> = {
        ok: 'Discord server authorized — /roll and /board work in that guild.',
        rare_required:
          'Ranked Plus Rare+ is required to add the Discord app to a server. Playing stays free after you link Discord on Account.',
        signin: 'Sign in, then try Add to Discord server again.',
        missing_guild:
          'Discord did not return a server. Pick a guild in the Discord prompt, or use a personal / user install to play for free.',
        denied: 'Discord install was cancelled.',
        bad_state: 'Install link expired — try Add to Discord server again.',
        config_error:
          'Discord install is not configured yet. Try again after deploy, or check DISCORD_CLIENT_ID.',
        error: 'Could not save that Discord server. Try again in a moment.',
      };
      setMsg(messages[discordInstall] ?? 'Discord install finished.');
      params.delete('discord_install');
      dirty = true;
    }

    if (dirty) {
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', next);
    }
  }, [session?.user?.id]);

  const startCheckout = async (tier: PaidRankedTier) => {
    if (!username.trim()) {
      setMsg(
        'Claim a public @username on Account before Ranked Plus checkout.',
      );
      return;
    }
    setCheckoutBusy(true);
    setMsg('Continuing to secure checkout…');
    try {
      const { url } = await createCheckout({
        tier,
        discountCode: friendCode.trim() || undefined,
      });
      window.location.href = url;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Checkout failed');
      setCheckoutBusy(false);
    }
  };

  const startPortal = async () => {
    setCheckoutBusy(true);
    setMsg(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Portal unavailable');
      setCheckoutBusy(false);
    }
  };

  const startTopupCheckout = async (sku: TopupSku) => {
    if (!username.trim()) {
      setMsg(
        'Claim a public @username on Account before Ranked top-up checkout.',
      );
      return;
    }
    setCheckoutBusy(true);
    setMsg('Continuing to secure checkout…');
    try {
      const { url } = await createTopupCheckout({ sku });
      window.location.href = url;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Top-up checkout failed');
      setCheckoutBusy(false);
    }
  };

  if (isPending) {
    return <p className="text-sm text-(--prose-3)">Loading session…</p>;
  }

  if (!session?.user) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider">
            Ranked Plus
          </h1>
          <p className="mt-1 text-sm text-(--prose-2)">
            Hour caps, cosmetics, and this-hour Boosts — sign in to subscribe or
            top up.
          </p>
        </div>
        <p className="text-sm text-(--prose-2)">
          <a
            className="font-semibold text-(--accent) underline"
            href="/account"
          >
            Sign in on Account
          </a>{' '}
          with a public @username, then return here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">
          Ranked Plus
        </h1>
        <p className="mt-1 text-sm text-(--prose-2)">
          Raise your Ranked hour cap, unlock frames and emblems, and buy
          this-hour Boosts. Checkout is handled securely by Polar.
        </p>
      </div>

      {msg && (
        <p className="rounded-lg border border-(--outline) bg-(--surface) px-3 py-2 text-sm text-(--prose-2)">
          {msg}
        </p>
      )}

      {!username.trim() && (
        <p className="text-sm text-(--prose-2)">
          Claim a public @username on{' '}
          <a
            className="font-semibold text-(--accent) underline"
            href="/account"
          >
            Account
          </a>{' '}
          before checkout.
        </p>
      )}

      <div
        ref={rankedPlusRef}
        className="space-y-3 rounded-lg border border-(--outline) bg-(--surface) p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-(--prose)">Subscription</h2>
            <p className="text-sm text-(--prose-2)">
              Monthly Ranked Plus tiers — Rare, Epic, or Anomaly.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${tierChipClass(rankedTier)}`}
          >
            {rankedTier === 'free'
              ? 'Free · 90/h'
              : `Ranked Plus · ${rankedTier}`}
          </span>
        </div>
        {isAdmin && rankedTier !== 'free' && !hasPolarBilling && (
          <p className="text-xs text-(--prose-3)">
            Admin complimentary access — full Anomaly cosmetics and quota
            without a Polar purchase. Manage billing appears after a real
            subscription.
          </p>
        )}
        {rankedTier !== 'free' && (
          <p className="text-xs text-(--prose-3)">
            Ranked Plus regenerates toward your hour cap every{' '}
            <strong className="text-(--prose)">6</strong> minutes:{' '}
            <strong className="text-(--prose)">Rare +1</strong>
            {' · '}
            <strong className="text-(--prose)">Epic +2</strong>
            {' · '}
            <strong className="text-(--prose)">Anomaly +3</strong>
            {' — '}
            you get{' '}
            <strong className="text-(--prose)">
              +{rankedRegenPerTick(rankedTier)}
            </strong>{' '}
            on {rankedTier} (no rollover past :00 UTC).
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {RANKED_PLUS_CATALOG.map((card) => {
            const current = rankedTier === card.tier;
            const highlighted = highlightTier === card.tier;
            const cardRank = rankedTierRank(card.tier);
            const currentRank = rankedTierRank(rankedTier);
            const label = current
              ? 'Current'
              : rankedTier === 'free'
                ? 'Subscribe'
                : cardRank > currentRank
                  ? 'Upgrade'
                  : 'Downgrade';
            const disabled = checkoutBusy || current || isAdmin;
            return (
              <div
                key={card.tier}
                className={`flex flex-col rounded-lg border-2 bg-(--bg) p-3 ${card.borderClass} ${
                  highlighted ? 'ring-2 ring-(--accent)/50' : ''
                }`}
              >
                <p className="font-display text-lg font-bold text-(--prose)">
                  {card.label}
                </p>
                <p className="font-mono text-sm tabular-nums text-(--prose-2)">
                  {card.rollsPerHour}/h · {card.priceCad}/mo
                </p>
                <p className="mt-1 flex-1 text-xs text-(--prose-3)">
                  {card.cosmetics}
                </p>
                <button
                  type="button"
                  disabled={disabled}
                  className="mt-3 border-2 border-(--accent) bg-(--accent) px-2 py-1.5 text-xs font-bold uppercase text-(--bg) disabled:opacity-50"
                  onClick={() => void startCheckout(card.tier)}
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-(--prose-2)">
            Friend code (optional)
          </label>
          <input
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.slice(0, 64))}
            placeholder="Discount code"
            className="w-full border border-(--outline) bg-(--bg) px-3 py-2 font-mono text-sm"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-(--prose-3)">
            You can also enter a code on Polar&apos;s checkout page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-(--prose-3)">
          {hasPolarBilling && (
            <button
              type="button"
              disabled={checkoutBusy}
              className="font-semibold text-(--accent) underline-offset-2 hover:underline disabled:opacity-50"
              onClick={() => void startPortal()}
            >
              Manage billing
            </button>
          )}
          <a className="underline" href="/payments">
            Payments
          </a>
          <a className="underline" href="/terms">
            Terms
          </a>
          <a className="underline" href="/account">
            Account
          </a>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-(--outline) bg-(--surface) p-4">
        <div>
          <h2 className="text-base font-bold text-(--prose)">Discord</h2>
          <p className="text-sm text-(--prose-2)">
            Anyone can play with{' '}
            <strong className="text-(--prose)">/roll</strong> and{' '}
            <strong className="text-(--prose)">/board</strong> after linking
            Discord on Account (personal / user install). Adding the app to a{' '}
            <strong className="text-(--prose)">server</strong> needs Ranked Plus
            Rare+.
          </p>
        </div>
        {rankedTier === 'free' ? (
          <p className="text-xs text-(--prose-3)">
            Subscribe to Rare or higher above, then use{' '}
            <strong className="text-(--prose)">Add to Discord server</strong>.
          </p>
        ) : (
          <a
            href="/api/discord/install"
            className="inline-flex border-2 border-(--accent) bg-(--accent) px-3 py-1.5 text-xs font-bold uppercase text-(--bg)"
          >
            Add to Discord server
          </a>
        )}
        <p className="text-xs text-(--prose-3)">
          Link Discord on{' '}
          <a className="underline" href="/account">
            Account
          </a>{' '}
          first. See{' '}
          <a
            className="underline"
            href="https://github.com/jondmarien/rngdle-unlocked/blob/main/docs/discord-bot.md"
            target="_blank"
            rel="noreferrer"
          >
            Discord bot docs
          </a>
          .
        </p>
      </div>

      <div
        ref={topupRef}
        className="space-y-3 rounded-lg border border-(--outline) bg-(--surface) p-4"
      >
        <div>
          <h2 className="text-base font-bold text-(--prose)">
            This hour — top-ups
          </h2>
          <p className="text-sm text-(--prose-2)">
            One-time Boosts and Overload for the current UTC hour only.
            {quotaResetsInSec != null
              ? ` About ${Math.max(1, Math.ceil(quotaResetsInSec / 60))}m left this hour.`
              : ''}
          </p>
          <p className="mt-1 text-xs text-(--prose-3)">
            {TOPUP_NON_ROLLOVER}
            {quotaResetsInSec != null && quotaResetsInSec < 600
              ? ' Less than 10 minutes remain — buy only if you will use it now.'
              : ''}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {RANKED_TOPUP_CATALOG.map((card) => {
            const packBlocked =
              !card.isOverload && topupPackBonus + card.bonusRolls > 90;
            const overloadBlocked = card.isOverload && hasOverload;
            const disabled = checkoutBusy || packBlocked || overloadBlocked;
            return (
              <div
                key={card.sku}
                className="flex flex-col rounded-lg border-2 border-(--outline) bg-(--bg) p-3"
              >
                <p className="font-display text-lg font-bold text-(--prose)">
                  {card.label}
                </p>
                <p className="font-mono text-sm tabular-nums text-(--prose-2)">
                  +{card.bonusRolls} · {card.priceCad}
                </p>
                <p className="mt-1 flex-1 text-xs text-(--prose-3)">
                  {card.blurb}
                </p>
                <button
                  type="button"
                  disabled={disabled}
                  className="mt-3 border-2 border-(--accent) bg-(--accent) px-2 py-1.5 text-xs font-bold uppercase text-(--bg) disabled:opacity-50"
                  onClick={() => void startTopupCheckout(card.sku)}
                >
                  {overloadBlocked
                    ? 'Owned'
                    : packBlocked
                      ? 'Cap reached'
                      : 'Buy'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-(--prose-3)">
          <a className="underline" href="/payments">
            Payments
          </a>
          <a className="underline" href="/terms">
            Terms
          </a>
        </div>
      </div>
    </div>
  );
}
