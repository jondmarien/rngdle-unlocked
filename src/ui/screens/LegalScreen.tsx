import type { ReactNode } from 'react';

type LegalKind = 'terms' | 'privacy';

const UPDATED = 'July 9, 2026';
const SITE = 'https://rngdle-unlocked.chron0.tech';
const CONTACT = 'jon@chron0.tech';

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-[var(--prose-2)]">
      <header className="space-y-2 border-b border-[var(--outline)] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--prose-3)]">
          RNGdle Unlocked
        </p>
        <h1 className="text-xl font-bold tracking-tight text-[var(--prose)]">
          {title}
        </h1>
        <p className="text-xs text-[var(--prose-3)]">Last updated: {UPDATED}</p>
      </header>
      {children}
      <footer className="space-y-2 border-t border-[var(--outline)] pt-4 text-xs text-[var(--prose-3)]">
        <p>
          Questions:{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
        </p>
        <p className="flex flex-wrap gap-3">
          <a className="underline" href="/terms">
            Terms of Service
          </a>
          <a className="underline" href="/privacy">
            Privacy Policy
          </a>
          <a className="underline" href="/about">
            About
          </a>
          <a className="underline" href={SITE}>
            Home
          </a>
        </p>
      </footer>
    </article>
  );
}

function TermsBody() {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          1. The service
        </h2>
        <p>
          <strong className="text-[var(--prose)]">RNGdle Unlocked</strong> (
          <a className="underline" href={SITE}>
            {SITE}
          </a>
          ) is a free, fan-made random-number game (roll 0–1,000,000, badges,
          EP, optional accounts). It is{' '}
          <strong className="text-[var(--prose)]">
            not affiliated with rngdle.com
          </strong>
          .
        </p>
        <p>
          The game works offline in your browser. Optional cloud features
          (sign-in, sync, Ranked, social) require an account.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          2. Accounts &amp; sign-in
        </h2>
        <p>You may create or link an account via:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Email (magic link and/or password with email verification)</li>
          <li>Discord OAuth</li>
          <li>GitHub OAuth</li>
        </ul>
        <p>
          You are responsible for activity under your account and for keeping
          credentials and linked providers secure. Do not impersonate others or
          use emails you do not control.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          3. Fair play
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-[var(--prose)]">
              Free play / Practice
            </strong>{' '}
            is client-side RNG synced on an honor system. Do not treat Practice
            leaderboards as competitive proof.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Ranked</strong> rolls are
            issued by the server. Attempting to forge Ranked scores, abuse rate
            limits, harass players, or exploit the service may result in bans or
            account removal.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          4. Content &amp; conduct
        </h2>
        <p>
          Usernames, bios, flair, and other profile text must not include hate,
          harassment, illegal content, or impersonation. We may remove content
          or restrict accounts that violate this.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          5. Availability
        </h2>
        <p>
          The service is provided “as is,” without warranties. Features may
          change, break, or go offline. Local progress in your browser may
          survive cloud outages; cloud data depends on our hosting providers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          6. Third-party sign-in
        </h2>
        <p>
          Discord and GitHub are third-party services. Their terms and privacy
          policies also apply when you use those buttons. We only request the
          scopes needed to identify you and (where available) your email.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          7. Changes
        </h2>
        <p>
          We may update these Terms. Continued use after an update means you
          accept the revised Terms. The “Last updated” date above will change
          when we do.
        </p>
      </section>
    </>
  );
}

function PrivacyBody() {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          1. Overview
        </h2>
        <p>
          This Privacy Policy explains what{' '}
          <strong className="text-[var(--prose)]">RNGdle Unlocked</strong>{' '}
          collects when you play or sign in, and how we use it. Solo play can
          stay entirely in your browser (
          <code className="text-xs">localStorage</code>). Cloud features are
          optional.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          2. Data we collect
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-[var(--prose)]">Account</strong> — email,
            display name, optional @username, password hash (if you use
            password), profile fields you set (bio, flair, avatar choice,
            accent).
          </li>
          <li>
            <strong className="text-[var(--prose)]">
              OAuth (Discord / GitHub)
            </strong>{' '}
            — provider account id, email (if the provider returns one), and
            tokens needed to keep the link working. We do not post to Discord or
            GitHub on your behalf.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Game progress</strong> —
            rolls, badges, EP, stats, and related sync data when you use cloud
            sync or Ranked.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Social</strong> — follows,
            public profile visibility settings, reports you submit, and
            notifications we generate for you.
          </li>
          <li>
            <strong className="text-[var(--prose)]">Technical</strong> — session
            cookies, approximate IP for rate limiting, and standard hosting /
            analytics logs (e.g. Vercel).
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          3. How we use data
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Run the game, sync progress, and show leaderboards / profiles</li>
          <li>Authenticate you (email magic link, verification, OAuth)</li>
          <li>Moderate abuse and enforce rate limits</li>
          <li>Improve reliability (error and access logs)</li>
        </ul>
        <p>
          We do <strong className="text-[var(--prose)]">not</strong> sell your
          personal information. We do not use Discord/GitHub access to message
          your friends or modify your repos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          4. Processors / hosting
        </h2>
        <p>Depending on features you use, data may be processed by:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel (app hosting)</li>
          <li>Neon (Postgres database)</li>
          <li>Resend (transactional email: magic links, verification)</li>
          <li>Discord / GitHub (only when you choose those sign-in methods)</li>
          <li>Vercel Analytics (aggregate traffic)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          5. Public information
        </h2>
        <p>
          If you set a public @username, your profile, public rolls, and
          leaderboard placement can be visible to others. You can hide your
          public codex from your Account settings. Share links only work for
          rolls that exist in the cloud.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          6. Retention &amp; deletion
        </h2>
        <p>
          We keep account and progress data while your account exists. You may
          request deletion by emailing{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          . Local browser data can be cleared by you anytime (clear site data /
          localStorage).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          7. Children
        </h2>
        <p>
          The service is not directed at children under 13. If you believe a
          child provided personal data, contact us and we will delete it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--prose)]">
          8. Changes
        </h2>
        <p>
          We may update this Policy. The “Last updated” date will change when we
          do. Continued use after an update means you accept the revised Policy.
        </p>
      </section>
    </>
  );
}

export function LegalScreen({ kind }: { kind: LegalKind }) {
  return (
    <LegalShell
      title={kind === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
    >
      {kind === 'terms' ? <TermsBody /> : <PrivacyBody />}
    </LegalShell>
  );
}
