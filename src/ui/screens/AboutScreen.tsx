import { WHATS_NEW } from '../../lib/whats-new';

const ROLL_MAX = '1,000,000';

export function AboutScreen() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-[var(--prose-2)]">
      <header className="space-y-2">
        <h1 className="text-xl font-bold uppercase tracking-wider text-[var(--prose)]">
          About
        </h1>
        <p className="text-base text-[var(--prose)]">
          <strong>RNGdle Unlocked</strong> is an unlimited random-number game:
          roll <span className="font-mono tabular-nums">0–{ROLL_MAX}</span>,
          collect badges, score EP, climb rarity — with{' '}
          <em className="text-[var(--prose)]">no 24-hour lock</em>.
        </p>
        <p>
          Solo by default (everything stays in your browser). Optional cloud
          accounts unlock usernames, auto-sync, dual leaderboards (Ranked +
          Practice), follows, public profiles, share links, challenges, and roll
          seals.
        </p>
        <p className="text-xs text-[var(--prose-3)]">
          Version{' '}
          <span className="font-mono tabular-nums">
            {import.meta.env.VITE_APP_VERSION ?? '0.0.0'}
          </span>
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
            What&apos;s new
          </h2>
          <p className="text-xs text-[var(--prose-3)]">
            Highlights for players — not a full engineering changelog.
          </p>
        </div>
        <ol className="space-y-5">
          {WHATS_NEW.map((entry) => (
            <li key={entry.version} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-xs font-semibold tabular-nums text-[var(--prose)]">
                  v{entry.version}
                </span>
                <span className="text-xs text-[var(--prose-3)]">
                  {entry.date}
                </span>
                <span className="text-sm font-semibold text-[var(--prose)]">
                  {entry.title}
                </span>
              </div>
              <ul className="list-disc space-y-1.5 pl-5">
                {entry.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="text-xs text-[var(--prose-3)]">
          Full release notes on{' '}
          <a
            className="underline"
            href="https://github.com/jondmarien/rngdle-unlocked/releases"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Releases
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
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
            total EP maps to a rarity tier and a score percentile (“top X% of
            roll scores,” not lottery odds).
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
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
            to the cloud (merge-safe — local + cloud never blind-overwrite).
          </li>
          <li>
            Set a public{' '}
            <strong className="text-[var(--prose)]">@username</strong> for the{' '}
            <a className="underline" href="/leaderboard">
              leaderboard
            </a>{' '}
            (both <strong className="text-[var(--prose)]">Ranked</strong> and{' '}
            <strong className="text-[var(--prose)]">Practice</strong> boards),
            profiles at <code className="text-xs">/u/you</code>, and vanity
            share paths.
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
            a profile. Rare rolls show under Board → Feed. They get an in-app
            alert when you follow them; optional browser notifications can be
            enabled under Alerts.
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
            account you can still copy roll text — no dead vanity URL.
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
          is optional — solo mode never requires an account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          Sharing rules (so links work)
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Sign in and set a public @username.</li>
          <li>Roll (auto-sync runs while signed in).</li>
          <li>
            Open Share — wait for “cloud ready,” then copy the vanity link or
            Discord text.
          </li>
          <li>
            Logged out: only local Discord-style text / PNG — no public URL.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
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
          account id produces a deterministic personal number you can re-verify
          — still not a lottery.
        </p>
        <p className="text-xs text-[var(--prose-3)]">
          This is not hardware TRNG. Attestation seals prove the server saw a
          roll claim for free-play/client rows — not that client CSPRNG was
          honest. Use Ranked when you care about competitive fairness.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
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
            <strong className="text-[var(--prose)]">Board</strong> — ranks +
            friends feed + Find
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
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

      <section className="space-y-3 border-t border-[var(--outline)] pt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
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
          original. Built for fun — not gambling, not financial advice, not a
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
