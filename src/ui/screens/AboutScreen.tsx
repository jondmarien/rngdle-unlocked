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
          Solo by default (everything in your browser). Optional cloud accounts
          unlock usernames, auto-sync, leaderboards, and public share links.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          How to play
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong className="text-[var(--prose)]">Roll</strong> — hit Generate
            on the home tab. Digits spin, then settle on a CSPRNG result.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Badges</strong> — number
            properties fire (patterns, math, culture, sequences…). Each badge
            awards EP.
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
            <strong className="text-[var(--prose)]">Collect &amp; share</strong>{' '}
            — browse History / Collection / Showcase; copy Discord-style text or
            a PNG card.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          Social &amp; cloud
        </h2>
        <p>
          Create an account under{' '}
          <a className="font-semibold text-[var(--prose)] underline" href="/account">
            Account
          </a>
          . While signed in:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-[var(--prose)]">Every new roll auto-syncs</strong>{' '}
            to the cloud (merge-safe — local + cloud never blind-overwrite).
          </li>
          <li>
            Set a public <strong className="text-[var(--prose)]">@username</strong>{' '}
            for the{' '}
            <a className="underline" href="/leaderboard">
              leaderboard
            </a>{' '}
            and profile pages at <code className="text-xs">/u/you</code>.
          </li>
          <li>
            Share links work for others only after the roll is in the cloud.
            OG previews use <code className="text-xs">/api/share/:id</code>;
            humans land on <code className="text-xs">/r/:id</code>.
          </li>
        </ul>
        <p className="text-xs text-[var(--prose-3)]">
          You can still export/import a save file offline under Settings. Cloud
          is optional — solo mode never requires an account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          Randomness
        </h2>
        <p>
          Rolls use a fortified browser CSPRNG path:{' '}
          <code className="text-xs">crypto.getRandomValues</code> mixed with
          interaction timing noise, hashed (SHA-256 when available), then
          reject-sampled into range. Not <code className="text-xs">Math.random</code>
          , not user-seedable.
        </p>
        <p className="text-xs text-[var(--prose-3)]">
          This is not hardware TRNG, not remote-attested randomness, and not
          server-authoritative yet. Treat it as a strong casual CSPRNG for a
          browser game — not a lottery or cryptographic commitment scheme.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          Fairness (honest version)
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>No daily lock; soft rate limits only protect cloud APIs from spam.</li>
          <li>
            Sync rejects absurd EP / out-of-range numbers, but rolls are still
            generated on the client.
          </li>
          <li>
            Leaderboards show who synced with a public username — not “proof”
            of impossible luck.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          Stack
        </h2>
        <p>
          React 19 · TypeScript · Vite · Tailwind · Vercel (SPA + serverless) ·
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
