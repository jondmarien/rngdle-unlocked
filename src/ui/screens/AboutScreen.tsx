export function AboutScreen() {
  return (
    <article className="prose-like space-y-4 text-sm leading-relaxed text-[var(--prose-2)]">
      <h1 className="text-xl font-bold uppercase tracking-wider text-[var(--prose)]">
        About
      </h1>
      <p>
        <strong className="text-[var(--prose)]">RNGdle Unlocked</strong> is an
        inspired solo random-number game. Roll any time from 0 to 1,000,000,
        collect badges for numerical properties, score EP, and climb rarity
        tiers — with <em>no 24-hour lock</em>.
      </p>
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
        How it works
      </h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Press Generate to roll a number.</li>
        <li>Badges fire based on math and digit patterns.</li>
        <li>EP sums determine rarity and score percentile.</li>
        <li>Journey badges unlock as your lifetime roll count grows (lifetime EP only).</li>
        <li>Share a roll as text or PNG.</li>
      </ol>
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
        Randomness
      </h2>
      <p>
        Rolls use a fortified browser CSPRNG path: <code>crypto.getRandomValues</code>{' '}
        mixed with interaction timing noise, hashed with SHA-256, then
        reject-sampled into range. Not <code>Math.random</code>, not user-seedable.
        This is not hardware TRNG or remote-attested randomness.
      </p>
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
        . Badge names, weights, and branding are original. Social features
        (accounts, leaderboards) are planned for a later MVP part 2.
      </p>
    </article>
  );
}
