import {
  BADGE_RARITY_THRESHOLDS,
  RARITY_LABELS,
  RARITY_ORDER,
  RARITY_THRESHOLDS,
  type RarityTier,
} from '../../game';
import { getWhatsNew } from '../../lib/whats-new';
import { RarityBadge } from '../components/RarityBadge';

const ROLL_MAX = '1,000,000';

/** Player-facing score bands aligned to percentile.ts anchors (Top X% of scores). */
const NUMBER_RARITY_BAND: Record<RarityTier, { minEp: number; band: string }> =
  {
    trash: { minEp: 0, band: 'Lower scores' },
    common: { minEp: 1_650, band: 'About top 82%+' },
    uncommon: { minEp: 2_200, band: 'About top 60%+' },
    rare: { minEp: 3_500, band: 'About top 38%+' },
    epic: { minEp: 6_500, band: 'About top 12%+' },
    anomaly: { minEp: 8_000, band: 'About top 5%+' },
    mythic: { minEp: 11_000, band: 'About top 1%+' },
  };

/** Soft badge-EP ladder (catalog weight), not published hit rates. */
const BADGE_RARITY_BAND: Record<RarityTier, { minEp: number; note: string }> = {
  trash: { minEp: 0, note: 'Tiny chip EP' },
  common: { minEp: 40, note: 'Common chip weight' },
  uncommon: { minEp: 250, note: 'Mid chip weight' },
  rare: { minEp: 900, note: 'Strong chip weight' },
  epic: { minEp: 2_500, note: 'Heavy chip weight' },
  anomaly: { minEp: 4_000, note: 'Very heavy chip' },
  mythic: { minEp: 8_000, note: 'Heaviest chips' },
};

function thresholdMin(
  table: { tier: RarityTier; minEP: number }[],
  tier: RarityTier,
) {
  return table.find((r) => r.tier === tier)?.minEP ?? 0;
}

export function AboutScreen() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 text-sm leading-relaxed text-[var(--prose-2)]">
      <header className="space-y-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--prose)] sm:text-3xl">
          About
        </h1>
        <p className="max-w-[65ch] text-base text-[var(--prose)]">
          <strong>RNGdle Unlocked</strong> is an unlimited random-number game:
          roll <span className="font-mono tabular-nums">0–{ROLL_MAX}</span>,
          collect badges, score EP, climb rarity, with no 24-hour lock.
        </p>
        <p className="max-w-[65ch]">
          Solo by default (everything stays in your browser). Optional cloud
          accounts unlock usernames, auto-sync, dual leaderboards (Ranked +
          Practice), Best Roll boards, Features requests, follows, public
          profiles, share links, challenges, and roll seals.
        </p>
        <p className="text-xs text-[var(--prose-3)]">
          Version{' '}
          <span className="font-mono tabular-nums">
            {import.meta.env.VITE_APP_VERSION ?? '0.0.0'}
          </span>
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-4 py-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          What&apos;s new
        </h2>
        <p className="max-w-[65ch] text-sm text-[var(--prose-2)]">
          Release highlights moved to their own timeline (
          <span className="font-mono tabular-nums">
            v{getWhatsNew()[0]?.version ?? '…'}
          </span>{' '}
          latest).
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a className="font-semibold underline" href="/whats-new">
            Open What&apos;s new
          </a>
          <a
            className="underline text-[var(--prose-3)]"
            href="https://github.com/jondmarien/rngdle-unlocked/releases"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Releases
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          How to play
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong className="text-[var(--prose)]">Roll</strong> — pick a mode
            at the top of the Roll tab, then Generate. Digits scramble in a
            glowing reel, then lock; EP shows as{' '}
            <code className="text-xs">???</code> until the number settles, then
            badges cascade in while EP counts up.
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-[var(--prose)]">Free play</strong> —
                unlimited browser CSPRNG (practice). Synced progress places on
                Leaderboard →{' '}
                <strong className="text-[var(--prose)]">Practice</strong>{' '}
                (social / honor system). Does not place on Ranked or claim
                community crowns. Absolute Ceiling (
                <span className="font-mono">1,000,000</span>) ~1 in a million,
                or a separate 1-in-100M jackpot, unlocks the ultra-rare seal.
              </li>
              <li>
                <strong className="text-[var(--prose)]">Ranked</strong> —
                server-issued free-play rolls (sign-in + @username). Places on
                Leaderboard →{' '}
                <strong className="text-[var(--prose)]">Ranked</strong>, and is
                the only free-play mode that can claim today / week / all-time
                community crowns and overtake alerts. Fair competition.
              </li>
              <li>
                <strong className="text-[var(--prose)]">Daily / Weekly</strong>{' '}
                — optional challenge: shared UTC seed + your account → one
                personal number for that period. Free and Ranked stay available
                anytime.
              </li>
            </ul>
          </li>
          <li>
            <strong className="text-[var(--prose)]">Community bests</strong> —
            on an idle Roll tab (no session roll yet), see{' '}
            <em>Today&apos;s best</em> and <em>Best this week</em> from Ranked
            (server) free-play rolls. They hide while you spin so your result
            stays center stage.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Badges</strong> — number
            properties fire (patterns, math, culture, sequences…). Each badge
            awards EP. First-time unlocks show a yellow{' '}
            <strong className="text-[var(--prose)]">NEW</strong> pill on the
            breakdown. Browse the{' '}
            <a className="underline" href="/collection">
              Codex
            </a>{' '}
            for locked vs unlocked entries, unlock timestamps, and a{' '}
            <strong className="text-[var(--prose)]">New</strong> tab (first-time
            unlocks from the last 5 minutes).
          </li>
          <li>
            <strong className="text-[var(--prose)]">Secrets</strong> — complete
            every badge in a codex section to earn a section mastery seal;
            finish all sections for Codex Absolute. Secrets never appear on a
            single roll.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Rarity &amp; EP</strong> —
            total EP maps to a rarity tier and a score percentile (top X% of
            roll scores, not lottery odds). See the ladders below.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Journey</strong> — lifetime
            milestones unlock as you keep rolling (journey EP is lifetime-only).
          </li>
          <li>
            <strong className="text-[var(--prose)]">
              Stats &amp; showcase
            </strong>{' '}
            —{' '}
            <a className="underline" href="/stats">
              Stats
            </a>{' '}
            shows rarity histograms, EP/hour, and a streak calendar; Showcase
            highlights best runs.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Share</strong> —
            Discord-style text, PNG card, or a public vanity link (account
            required). Mythic and anomaly rolls auto-open share after reveal.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Number rarity
        </h2>
        <p className="max-w-[65ch]">
          Your roll&apos;s overall rarity comes from{' '}
          <strong className="text-[var(--prose)]">total EP</strong> (sum of
          badge weights on that number), then a score percentile curve. Higher
          EP ranks rarer. This is <em>not</em> the same as lottery odds of
          landing the number.
        </p>
        <div className="overflow-hidden rounded-lg border border-[var(--outline)] bg-[var(--surface)]">
          <ul className="divide-y divide-[var(--outline)]">
            {[...RARITY_ORDER].reverse().map((tier) => {
              const band = NUMBER_RARITY_BAND[tier];
              const minEp = thresholdMin(RARITY_THRESHOLDS, tier) || band.minEp;
              return (
                <li
                  key={tier}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <RarityBadge rarity={tier} />
                  <div className="text-right text-xs sm:text-sm">
                    <div className="font-mono tabular-nums text-[var(--prose)]">
                      ≥ {minEp.toLocaleString()} EP
                    </div>
                    <div className="text-[var(--prose-3)]">{band.band}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-[var(--prose-3)]">
          Compared with{' '}
          <a
            className="underline"
            href="https://www.rngdle.com/about"
            target="_blank"
            rel="noreferrer"
          >
            rngdle.com
          </a>
          : they label tiers with population bands (e.g. Mythic = top 1%). We
          use the same seven tier names, but thresholds are{' '}
          <strong className="text-[var(--prose-2)]">EP-calibrated</strong> for
          this catalog (dense badge stacking), and we show{' '}
          <strong className="text-[var(--prose-2)]">Top X% of scores</strong>{' '}
          from our curve, not their published bottom/top cutoffs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Badge rarity
        </h2>
        <p className="max-w-[65ch]">
          Each badge chip has a rarity from its{' '}
          <strong className="text-[var(--prose)]">individual EP weight</strong>{' '}
          in our catalog (heavier badges score higher chips). Full-roll rarity
          uses the sum of chips, not the rarest chip alone.
        </p>
        <div className="overflow-hidden rounded-lg border border-[var(--outline)] bg-[var(--surface)]">
          <ul className="divide-y divide-[var(--outline)]">
            {[...RARITY_ORDER].reverse().map((tier) => {
              const band = BADGE_RARITY_BAND[tier];
              const minEp =
                thresholdMin(BADGE_RARITY_THRESHOLDS, tier) || band.minEp;
              return (
                <li
                  key={`badge-${tier}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <RarityBadge rarity={tier} />
                  <div className="text-right text-xs sm:text-sm">
                    <div className="font-mono tabular-nums text-[var(--prose)]">
                      ≥ {minEp.toLocaleString()} EP on that badge
                    </div>
                    <div className="text-[var(--prose-3)]">{band.note}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-[var(--prose-3)]">
          On rngdle.com, badge rarity is labeled by{' '}
          <strong className="text-[var(--prose-2)]">hit probability</strong>{' '}
          (e.g. Mythic &lt; 0.001% of rolls). We do not publish per-badge hit
          rates here; chip tiers follow catalog EP instead. Names overlap; math
          does not.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Can you roll a single digit?
        </h2>
        <p className="max-w-[65ch]">
          Yes. Free play and Ranked draw uniformly from{' '}
          <span className="font-mono tabular-nums">0–{ROLL_MAX}</span> (
          <span className="font-mono tabular-nums">1,000,001</span> outcomes).
          Any specific value like <span className="font-mono">2</span> is about{' '}
          <strong className="text-[var(--prose)]">1 in a million</strong>. Any
          of <span className="font-mono">1–9</span> is about{' '}
          <strong className="text-[var(--prose)]">9 in a million</strong> (~1 in
          111k). That is why a &ldquo;4&rdquo; can feel like a personal low
          while a &ldquo;2&rdquo; on another site still looks wild: rare draws
          stack huge badge EP on tiny numbers (primes, powers of two, Fibonacci,
          Single Digit, and more).
        </p>
        <p className="max-w-[65ch] text-xs text-[var(--prose-3)]">
          Example under our catalog: <span className="font-mono">2</span>{' '}
          currently lands as{' '}
          <span className="rarity-mythic font-semibold">
            {RARITY_LABELS.mythic}
          </span>{' '}
          (~15k+ EP) when all matching chips fire. Other catalogs (including
          rngdle.com) use different weights, so their EP totals will not match
          ours.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Social &amp; cloud
        </h2>
        <p>
          Create an account under{' '}
          <a
            className="font-semibold text-[var(--prose)] underline"
            href="/account"
          >
            Account
          </a>
          . While signed in:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-[var(--prose)]">
              Every new roll auto-syncs
            </strong>{' '}
            to the cloud (merge-safe; local + cloud never blind-overwrite).
          </li>
          <li>
            Set a public{' '}
            <strong className="text-[var(--prose)]">@username</strong> for the{' '}
            <a className="underline" href="/leaderboard">
              leaderboard
            </a>{' '}
            (Ranked and Practice; Total EP and Best Roll), profiles at{' '}
            <code className="text-xs">/u/you</code>, and vanity share paths.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Features</strong> — submit
            and upvote requests under the Features tab (admins update status).
          </li>
          <li>
            <strong className="text-[var(--prose)]">Public profile look</strong>{' '}
            — accent color, flair, bio, and a preset emblem avatar on Account.
          </li>
          <li>
            <strong className="text-[var(--prose)]">You on the board</strong> —
            your rank is highlighted on Ranked or Practice after you place, even
            if you are outside the top 50 list.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Follow friends</strong> —
            Board → Find (username search), + on a leaderboard row, or Follow on
            a profile. Rolls show under Board → Feed. They get an in-app alert
            when you follow them; optional browser notifications can be enabled
            under Alerts.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Alerts</strong> — Activity
            (follows, first-time badge unlocks, secret masteries, and when
            someone overtakes your daily / weekly / all-time crown) and System
            messages (developer broadcasts + community crown notices when
            someone takes today&apos;s, this week&apos;s, or the all-time best{' '}
            <strong className="text-[var(--prose)]">Ranked</strong> roll).
          </li>
          <li>
            Optional{' '}
            <strong className="text-[var(--prose)]">
              daily / weekly challenge
            </strong>{' '}
            seeds and{' '}
            <strong className="text-[var(--prose)]">Prove this roll</strong>{' '}
            (server HMAC seal). A seal means the server stamped that claim; Free
            play still uses client CSPRNG; Ranked uses server CSPRNG.
          </li>
          <li>
            Share links look like{' '}
            <code className="text-xs">/s/yourname/xK9m2pQ3</code>. Public links
            appear only after the roll is confirmed in the cloud. Without an
            account you can still copy roll text; no dead vanity URL.
          </li>
          <li>
            Discord previews get{' '}
            <strong className="text-[var(--prose)]">dynamic OG images</strong>{' '}
            for rolls and public profiles (number / rarity / EP, or profile
            stats).
          </li>
        </ul>
        <p className="text-xs text-[var(--prose-3)]">
          You can still export/import a save file offline under Settings. Cloud
          is optional; solo mode never requires an account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Sharing rules (so links work)
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Sign in and set a public @username.</li>
          <li>Roll (auto-sync runs while signed in).</li>
          <li>
            Open Share; wait for &ldquo;cloud ready,&rdquo; then copy the vanity
            link or Discord text.
          </li>
          <li>
            Logged out: only local Discord-style text / PNG; no public URL.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Randomness
        </h2>
        <p>
          <strong className="text-[var(--prose)]">Free play</strong> uses a
          fortified browser CSPRNG path:{' '}
          <code className="text-xs">crypto.getRandomValues</code> mixed with
          interaction timing noise, hashed (SHA-256 when available), then
          reject-sampled into range. Not{' '}
          <code className="text-xs">Math.random</code>, not user-seedable.
        </p>
        <p>
          <strong className="text-[var(--prose)]">Ranked</strong> free play is
          different: the server issues the number with Node CSPRNG (
          <code className="text-xs">POST /api/ranked-roll</code>
          ), scores badges/EP, and stores{' '}
          <code className="text-xs">source=ranked</code>. Client sync cannot
          forge ranked rows.
        </p>
        <p>
          Challenge mode is different again: a shared period seed plus your
          account id produces a deterministic personal number you can re-verify;
          still not a lottery.
        </p>
        <p className="text-xs text-[var(--prose-3)]">
          This is not hardware TRNG. Attestation seals prove the server saw a
          roll claim for free-play/client rows; not that client CSPRNG was
          honest. Use Ranked when you care about competitive fairness.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Fairness (honest version)
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            No daily lock and no free-play roll-upload cap. Soft rate limits
            only protect cloud APIs from spam bursts. Ranked is capped at about
            90 rolls per hour (server cost); Free play stays unlimited.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Ranked board</strong> —
            server-issued free-play only. Fair competition baseline.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Practice board</strong> —
            synced free-play / overall progress. Social honor system; still
            client-authoritative for Free play RNG.
          </li>
          <li>Community crowns and overtake alerts use Ranked rolls only.</li>
          <li>
            Optional seals and challenge seeds add competitive flavor without
            claiming impossible fairness.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Tabs at a glance
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-xs sm:text-sm">
          <li>
            <strong className="text-[var(--prose)]">Roll</strong> — free / daily
            / weekly generate, reel animation, community bests when idle
          </li>
          <li>
            <strong className="text-[var(--prose)]">History</strong> — last
            rolls + share
          </li>
          <li>
            <strong className="text-[var(--prose)]">Codex</strong> — badge
            encyclopedia, unlock times, New (5 min) tab
          </li>
          <li>
            <strong className="text-[var(--prose)]">Showcase</strong> — best
            runs &amp; streaks
          </li>
          <li>
            <strong className="text-[var(--prose)]">Stats</strong> — histogram
            &amp; calendar
          </li>
          <li>
            <strong className="text-[var(--prose)]">Board</strong> — Total EP /
            Best Roll, Ranked + Practice, feed, Find
          </li>
          <li>
            <strong className="text-[var(--prose)]">Features</strong> — submit
            and upvote requests
          </li>
          <li>
            <strong className="text-[var(--prose)]">What&apos;s new</strong> —
            release chronicle timeline
          </li>
          <li>
            <strong className="text-[var(--prose)]">Alerts</strong> — activity
            &amp; system (header badge)
          </li>
          <li>
            <strong className="text-[var(--prose)]">Profile / Account</strong> —
            vanity look, auth, push/pull
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Stack
        </h2>
        <p>
          React 19 · TypeScript · Vite · Tailwind · Outfit / Syne / JetBrains
          Mono · Vercel (SPA + serverless) · Neon Postgres · Better Auth ·
          Drizzle.
        </p>
        <p className="text-xs text-[var(--prose-3)]">
          Source:{' '}
          <a
            className="underline"
            href="https://github.com/jondmarien/rngdle-unlocked"
            target="_blank"
            rel="noreferrer"
          >
            github.com/jondmarien/rngdle-unlocked
          </a>
          {' · '}
          Live:{' '}
          <a
            className="underline"
            href="https://rngdle-unlocked.chron0.tech"
            target="_blank"
            rel="noreferrer"
          >
            rngdle-unlocked.chron0.tech
          </a>
          {' · '}
          Architecture:{' '}
          <a
            className="underline"
            href="https://github.com/jondmarien/rngdle-unlocked/blob/main/docs/ARCHITECTURE.md"
            target="_blank"
            rel="noreferrer"
          >
            docs/ARCHITECTURE.md
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Privacy &amp; account safety
        </h2>
        <p className="max-w-[65ch]">
          Cloud accounts are optional. When you use them, here is what we
          actually protect today (not a copy of another site&apos;s privacy
          marketing):
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-[var(--prose)]">HTTPS</strong> in production
            (traffic encrypted in transit).
          </li>
          <li>
            <strong className="text-[var(--prose)]">Password hashing</strong>{' '}
            (Better Auth / scrypt) when you choose email + password. We never
            store your password in plaintext.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Magic links</strong> expire
            after 10 minutes; email signup also requires verification.
          </li>
          <li>
            <strong className="text-[var(--prose)]">
              Soft API rate limits
            </strong>{' '}
            reduce spam bursts on sync, Ranked, and social endpoints.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Optional roll seals</strong>{' '}
            use HMAC on a roll claim. That is not email hashing, and it does not
            prove Free-play client RNG honesty.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Delete your account</strong>{' '}
            from{' '}
            <a className="underline" href="/account">
              Account
            </a>{' '}
            (confirm via email). Cloud identity, synced progress, and related
            social rows are removed; clear browser site data separately for
            local saves.
          </li>
        </ul>
        <p className="max-w-[65ch] text-xs text-[var(--prose-3)]">
          We do <em>not</em> hash emails for storage (login and mail need the
          address), and we do not claim session IP / user-agent hashing. Full
          wording lives in the{' '}
          <a className="underline" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--outline)] pt-6">
        <h2 className="font-display text-lg font-bold text-[var(--prose)]">
          Disclaimer
        </h2>
        <p>
          Not affiliated with{' '}
          <a
            className="underline"
            href="https://www.rngdle.com/"
            target="_blank"
            rel="noreferrer"
          >
            rngdle.com
          </a>
          . Inspired by the genre; badge names, weights, branding, and code are
          original. Built for fun; not gambling, not financial advice, not a
          security product.
        </p>
        <p className="flex flex-wrap gap-3 text-xs">
          <a className="underline" href="/terms">
            Terms of Service
          </a>
          <a className="underline" href="/privacy">
            Privacy Policy
          </a>
        </p>
      </section>
    </article>
  );
}
