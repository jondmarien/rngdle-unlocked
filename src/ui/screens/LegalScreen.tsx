import type { ReactNode } from 'react';

type LegalKind = 'terms' | 'privacy' | 'payments';

const UPDATED = 'July 17, 2026';
const SITE = 'https://rngdle-unlocked.chron0.tech';
const CONTACT = 'jon@chron0.tech';
const POLAR_TERMS = 'https://polar.sh/legal/terms';
const POLAR_PRIVACY = 'https://polar.sh/legal/privacy';

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-(--prose-2)">
      <header className="space-y-2 border-b border-(--outline) pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-(--prose-3)">
          RNGdle Unlocked
        </p>
        <h1 className="text-xl font-bold tracking-tight text-(--prose)">
          {title}
        </h1>
        <p className="text-xs text-(--prose-3)">Last updated: {UPDATED}</p>
        <p className="flex flex-wrap gap-3 pt-1 text-xs">
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/terms"
          >
            Terms
          </a>
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/privacy"
          >
            Privacy
          </a>
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/payments"
          >
            Payments
          </a>
        </p>
      </header>
      {children}
      <footer className="space-y-2 border-t border-(--outline) pt-4 text-xs text-(--prose-3)">
        <p>
          Questions:{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={`mailto:${CONTACT}`}
          >
            {CONTACT}
          </a>
        </p>
        <p className="flex flex-wrap gap-3">
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/terms"
          >
            Terms of Service
          </a>
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/privacy"
          >
            Privacy Policy
          </a>
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/payments"
          >
            Payments
          </a>
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/about"
          >
            About
          </a>
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={SITE}
          >
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          1. The service
        </h2>
        <p>
          <strong className="text-(--prose)">RNGdle Unlocked</strong> (
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={SITE}
          >
            {SITE}
          </a>
          ) is a free, fan-made random-number game (roll 0–1,000,000, badges,
          EP, optional accounts). It is{' '}
          <strong className="text-(--prose)">
            not affiliated with rngdle.com
          </strong>
          .
        </p>
        <p>
          The game works offline in your browser. Optional cloud features
          (sign-in, sync, Ranked, social) require an account. Optional paid
          Ranked subscription tiers may be offered via Polar — see{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/payments"
          >
            Payments
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          3. Fair play
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-(--prose)">Free play / Practice</strong> is
            client-side RNG synced on an honor system. Do not treat Practice
            leaderboards as competitive proof.
          </li>
          <li>
            <strong className="text-(--prose)">Ranked</strong> rolls are issued
            by the server. Attempting to forge Ranked scores, abuse rate limits,
            harass players, or exploit the service may result in bans or account
            removal.
          </li>
          <li>
            <strong className="text-(--prose)">Arcade</strong> Digits runs are
            server-authoritative and never convertible to EP. Do not treat
            Arcade high scores as interchangeable with Ranked or Practice EP.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          4. Content &amp; conduct
        </h2>
        <p>
          Usernames, bios, flair, and other profile text must not include hate,
          harassment, illegal content, or impersonation. We may remove content
          or restrict accounts that violate this.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          5. Optional paid features
        </h2>
        <p>
          The core game (including Free play) remains available without
          purchase. Optional paid features — such as higher Ranked
          rolls-per-hour subscription tiers — are sold through{' '}
          <strong className="text-(--prose)">Polar</strong> as Merchant of
          Record. Polar’s{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={POLAR_TERMS}
            target="_blank"
            rel="noreferrer"
          >
            terms
          </a>{' '}
          apply to the payment itself. After Polar confirms payment, we grant
          the matching in-game entitlement.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Paid Ranked quota is a competitive advantage on Ranked boards and
            crowns. We do not guarantee any particular ranking or outcome.
          </li>
          <li>
            Prices and tiers may change. Active subscriptions follow Polar’s
            billing and cancellation rules until the period ends or access is
            revoked.
          </li>
          <li>
            Chargeback fraud, payment abuse, or attempts to keep paid access
            after a refund may result in entitlement revocation and account
            action.
          </li>
        </ul>
        <p>
          Details:{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/payments"
          >
            Payments
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          6. Availability
        </h2>
        <p>
          The service is provided “as is,” without warranties. Features may
          change, break, or go offline. Local progress in your browser may
          survive cloud outages; cloud data depends on our hosting providers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          7. Third-party sign-in
        </h2>
        <p>
          Discord and GitHub are third-party services. Their terms and privacy
          policies also apply when you use those buttons. We only request the
          scopes needed to identify you and (where available) your email.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          8. Changes
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          1. Overview
        </h2>
        <p>
          This Privacy Policy explains what{' '}
          <strong className="text-(--prose)">RNGdle Unlocked</strong> collects
          when you play or sign in, and how we use it. Solo play can stay
          entirely in your browser (
          <code className="text-xs">localStorage</code>). Cloud features are
          optional. Paid purchases (when offered) go through Polar — see{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/payments"
          >
            Payments
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          2. Data we collect
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-(--prose)">Account</strong> — email, display
            name, optional @username, password hash (if you use password),
            profile fields you set (bio, flair, avatar choice, accent).
          </li>
          <li>
            <strong className="text-(--prose)">OAuth (Discord / GitHub)</strong>{' '}
            — provider account id, email (if the provider returns one), and
            tokens needed to keep the link working. We do not post to GitHub on
            your behalf. If you use the optional Discord bot (slash commands),
            roll and leaderboard messages may be posted in channels where you
            run those commands. Adding the app to a Discord server is limited to
            Ranked Plus Rare+ subscribers; playing after you link Discord does
            not require a paid tier.
          </li>
          <li>
            <strong className="text-(--prose)">Game progress</strong> — rolls,
            badges, EP, stats, and related sync data when you use cloud sync or
            Ranked.
          </li>
          <li>
            <strong className="text-(--prose)">Social</strong> — follows, public
            profile visibility settings, reports you submit, and notifications
            we generate for you.
          </li>
          <li>
            <strong className="text-(--prose)">Technical</strong> — session
            cookies, approximate IP for rate limiting, and standard hosting /
            analytics logs (e.g. Vercel).
          </li>
          <li>
            <strong className="text-(--prose)">Payments (Polar)</strong> — see
            section 5.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          3. How we use data
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Run the game, sync progress, and show leaderboards / profiles</li>
          <li>Authenticate you (email magic link, verification, OAuth)</li>
          <li>Moderate abuse and enforce rate limits</li>
          <li>
            Fulfill and revoke paid entitlements after Polar confirms payment
          </li>
          <li>Improve reliability (error and access logs)</li>
        </ul>
        <p>
          We do <strong className="text-(--prose)">not</strong> sell your
          personal information. We do not use Discord/GitHub access to message
          your friends or modify your repos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          4. Processors / hosting
        </h2>
        <p>Depending on features you use, data may be processed by:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel (app hosting)</li>
          <li>Neon (Postgres database)</li>
          <li>Resend (transactional email: magic links, verification)</li>
          <li>Discord / GitHub (only when you choose those sign-in methods)</li>
          <li>Vercel Analytics (aggregate traffic)</li>
          <li>
            Polar (Merchant of Record for optional purchases — see section 5)
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          5. Payments &amp; Polar
        </h2>
        <p>
          When you buy an optional subscription or top-up, Polar processes the
          payment (card data stays with Polar / its processors — we do not store
          full card numbers). For fulfillment we may send or receive:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Your account id as Polar{' '}
            <code className="text-xs">external_id</code>, plus email and display
            name if provided at checkout
          </li>
          <li>
            Polar customer, subscription, product, and order identifiers; tier /
            status / period end for entitlement sync
          </li>
          <li>
            Webhook events (e.g. order paid/refunded, subscription lifecycle,
            customer updates) so we can grant or revoke Ranked caps
          </li>
        </ul>
        <p>
          We keep entitlement and order identifiers for fraud/refund audit while
          your account exists (or as needed to resolve disputes). Polar’s{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={POLAR_PRIVACY}
            target="_blank"
            rel="noreferrer"
          >
            privacy policy
          </a>{' '}
          also applies. More detail:{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/payments"
          >
            Payments
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          6. Public information
        </h2>
        <p>
          If you set a public @username, your profile, public rolls, and
          leaderboard placement can be visible to others. You can hide your
          public codex from your Account settings. Share links only work for
          rolls that exist in the cloud.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          7. Retention &amp; deletion
        </h2>
        <p>
          We keep account and progress data while your account exists. You can
          permanently delete your cloud account from{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/account"
          >
            Account
          </a>{' '}
          (email confirmation required). That removes your auth identity, synced
          progress, rolls, and related social data we store for the account.
          Local browser data is separate: clear site data / localStorage
          anytime. If self-serve delete fails, email{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={`mailto:${CONTACT}`}
          >
            {CONTACT}
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          8. Children
        </h2>
        <p>
          The service is not directed at children under 13. If you believe a
          child provided personal data, contact us and we will delete it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          9. Changes
        </h2>
        <p>
          We may update this Policy. The “Last updated” date will change when we
          do. Continued use after an update means you accept the revised Policy.
        </p>
      </section>
    </>
  );
}

function PaymentsBody() {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          1. Merchant of Record
        </h2>
        <p>
          Optional purchases for RNGdle Unlocked are processed by{' '}
          <strong className="text-(--prose)">Polar</strong> (polar.sh) as{' '}
          <strong className="text-(--prose)">Merchant of Record</strong>. Polar
          handles checkout, taxes, invoices, and payment processing. After Polar
          confirms a successful payment (or subscription status), RNGdle
          Unlocked grants the matching in-game entitlement (for example a higher
          Ranked rolls-per-hour cap).
        </p>
        <p>
          Polar’s{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={POLAR_TERMS}
            target="_blank"
            rel="noreferrer"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={POLAR_PRIVACY}
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>{' '}
          apply to the transaction. Our{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/terms"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/privacy"
          >
            Privacy Policy
          </a>{' '}
          cover how we use the game and fulfillment data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          2. What you can buy
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-(--prose)">Ranked subscriptions</strong> —
            rarity-themed tiers (Rare / Epic / Anomaly) that raise your Ranked
            rolls-per-hour above the free baseline (90/hour UTC). Prices are in{' '}
            <strong className="text-(--prose)">CAD</strong>.
          </li>
          <li>
            <strong className="text-(--prose)">One-time top-ups</strong> (when
            offered) — partial refill, full refill, or Overload for the{' '}
            <strong className="text-(--prose)">current UTC hour only</strong>.
            Unused rolls do <strong className="text-(--prose)">not</strong> roll
            over into the next hour.
          </li>
        </ul>
        <p>
          Free play remains unlimited offline. Paid Ranked capacity is a{' '}
          <strong className="text-(--prose)">competitive advantage</strong> on
          Ranked leaderboards and crowns — we disclose that clearly; we do not
          guarantee any ranking.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          3. Subscriptions
        </h2>
        <p>
          Subscriptions renew until you cancel in Polar’s customer portal (or
          equivalent). Access follows Polar status: active (and short past-due
          grace) keeps the paid cap; revoked / refunded returns you to the free
          Ranked cap. We may change prices or tier definitions for new
          purchases; existing active subs follow Polar’s rules for the current
          period.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          4. Top-ups &amp; Overload (no rollover)
        </h2>
        <p>
          If you buy a one-time Ranked top-up or Overload, it applies only until
          the current UTC hour ends (<code className="text-xs">:00:00Z</code>
          ). At the next UTC hour, unused bonus rolls are gone — there is no
          wallet carry-over. Checkout and product copy will state this before
          you pay.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          5. Refunds &amp; disputes
        </h2>
        <p>
          Refunds, chargebacks, and tax invoices are handled under Polar’s
          Merchant of Record policies. If a subscription payment is refunded or
          Polar revokes the subscription, we revoke the paid Ranked entitlement.
          Questions about a charge:{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href={`mailto:${CONTACT}`}
          >
            {CONTACT}
          </a>{' '}
          and/or Polar support for the payment itself.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--prose)">
          6. Data shared for billing
        </h2>
        <p>
          To link a purchase to your game account we may provide Polar your user
          id (as <code className="text-xs">external_id</code>), email, and name
          at checkout. We store Polar customer/subscription/order ids and tier
          status for fulfillment — not your full card number. Details are also
          in the{' '}
          <a
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            href="/privacy"
          >
            Privacy Policy
          </a>
          .
        </p>
      </section>
    </>
  );
}

export function LegalScreen({ kind }: { kind: LegalKind }) {
  const title =
    kind === 'terms'
      ? 'Terms of Service'
      : kind === 'privacy'
        ? 'Privacy Policy'
        : 'Payments';
  return (
    <LegalShell title={title}>
      {kind === 'terms' ? (
        <TermsBody />
      ) : kind === 'privacy' ? (
        <PrivacyBody />
      ) : (
        <PaymentsBody />
      )}
    </LegalShell>
  );
}
