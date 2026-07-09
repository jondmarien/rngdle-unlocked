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
          accounts unlock usernames, auto-sync, leaderboards, follows, public
          share links, challenges, and roll seals.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          How to play
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong className="text-[var(--prose)]">Roll</strong> — pick a mode
            at the top of the Roll tab, then Generate. Digits spin, then settle.
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-[var(--prose)]">Free play</strong> —
                unlimited browser CSPRNG (new number every Generate).
              </li>
              <li>
                <strong className="text-[var(--prose)]">Daily / Weekly</strong> —
                optional challenge: shared UTC seed + your account → one personal
                number for that period (same inputs always match). Free play
                stays available anytime.
              </li>
            </ul>
          </li>
          <li>
            <strong className="text-[var(--prose)]">Badges</strong> — number
            properties fire (patterns, math, culture, sequences…). Each badge
            awards EP. Browse the{' '}
            <a className="underline" href="/collection">
              Codex
            </a>{' '}
            for locked vs unlocked entries (spoilers stay hidden until earned).
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
            <strong className="text-[var(--prose)]">Stats &amp; showcase</strong>{' '}
            —{' '}
            <a className="underline" href="/stats">
              Stats
            </a>{' '}
            shows rarity histograms, EP/hour, and a streak calendar; Showcase
            highlights best runs.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Share</strong> — Discord-style
            text, PNG card, or a public vanity link (account required). Mythic
            and anomaly rolls auto-open share after reveal.
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
            </a>
            , profiles at <code className="text-xs">/u/you</code>, and vanity
            share paths.
          </li>
          <li>
            <strong className="text-[var(--prose)]">You on the board</strong> —
            your rank is highlighted after sync, even if you are outside the top
            50 list.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Follow friends</strong> —
            follow from their profile; rare+ rolls show up under Board → Feed.
          </li>
          <li>
            Optional{' '}
            <strong className="text-[var(--prose)]">daily / weekly challenge</strong>{' '}
            seeds (personal number from shared seed + your account) and{' '}
            <strong className="text-[var(--prose)]">Prove this roll</strong>{' '}
            (server HMAC seal). A seal means the server stamped that claim; free
            play is still client-side RNG.
          </li>
          <li>
            Share links look like{' '}
            <code className="text-xs">/s/yourname/xK9m2pQ3</code>. Public links
            appear only after the roll is confirmed in the cloud. Without an
            account you can still copy roll text — no dead vanity URL.
          </li>
          <li>
            Discord previews get a{' '}
            <strong className="text-[var(--prose)]">dynamic OG image</strong>{' '}
            (number, rarity, EP, handle) via <code className="text-xs">/api/og</code>
            .
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
          Free-play rolls use a fortified browser CSPRNG path:{' '}
          <code className="text-xs">crypto.getRandomValues</code> mixed with
          interaction timing noise, hashed (SHA-256 when available), then
          reject-sampled into range. Not{' '}
          <code className="text-xs">Math.random</code>, not user-seedable.
        </p>
        <p>
          Challenge mode is different on purpose: a shared period seed plus your
          account id produces a deterministic personal number you can re-verify
          — still not a lottery.
        </p>
        <p className="text-xs text-[var(--prose-3)]">
          This is not hardware TRNG and not fully server-authoritative free play.
          Attestation seals prove the server saw a roll claim, not that the
          client CSPRNG was honest. Treat free play as a strong casual browser
          CSPRNG — not a cryptographic commitment scheme.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          Fairness (honest version)
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            No daily lock; soft rate limits only protect cloud APIs from spam.
          </li>
          <li>
            Sync rejects absurd EP / out-of-range numbers, but free-play rolls
            are still generated on the client.
          </li>
          <li>
            Leaderboards show who synced with a public username — not “proof”
            of impossible luck.
          </li>
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
            <strong className="text-[var(--prose)]">Roll</strong> — free /
            daily / weekly generate
          </li>
          <li>
            <strong className="text-[var(--prose)]">History</strong> — last rolls
            + share
          </li>
          <li>
            <strong className="text-[var(--prose)]">Codex</strong> — badge
            encyclopedia
          </li>
          <li>
            <strong className="text-[var(--prose)]">Showcase</strong> — best
            runs &amp; streaks
          </li>
          <li>
            <strong className="text-[var(--prose)]">Stats</strong> — histogram &amp;
            calendar
          </li>
          <li>
            <strong className="text-[var(--prose)]">Board</strong> — ranks +
            friends feed
          </li>
          <li>
            <strong className="text-[var(--prose)]">Account</strong> — auth,
            username, push/pull
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          Stack
        </h2>
        <p>
          React 19 · TypeScript 7 · Vite · Tailwind · Vercel (SPA + serverless) ·
          Neon Postgres · Better Auth · Drizzle.
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
      </section>
    </article>
  );
}
