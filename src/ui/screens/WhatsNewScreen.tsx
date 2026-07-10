import {
  getWhatsNew,
  type WhatsNewEntry,
  type WhatsNewSection,
} from '../../lib/whats-new';

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderBullet(bullet: string, idx: number) {
  const parts = bullet.split(/(\*\*[^*]+\*\*)/g);
  return (
    <li key={idx} className="mt-1.5 text-pretty">
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-(--prose)">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </li>
  );
}

function SectionBlock({ section }: { section: WhatsNewSection }) {
  return (
    <div className="mt-4 first:mt-0">
      {section.heading && (
        <h3 className="mb-2 border-b border-(--outline) pb-1 font-display text-base font-bold text-(--prose)">
          {section.heading}
        </h3>
      )}
      <p className="text-pretty text-sm leading-relaxed text-(--prose-2)">
        {section.body}
      </p>
      {section.bullets && section.bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm leading-relaxed text-(--prose-2) marker:text-(--accent)">
          {section.bullets.map((b, i) => renderBullet(b, i))}
        </ul>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: WhatsNewEntry }) {
  const formattedDate = formatDate(entry.date);

  return (
    <article className="relative">
      <div className="flex flex-col gap-y-4 md:flex-row">
        <div className="shrink-0 md:w-40">
          <div className="pb-2 md:sticky md:top-20">
            <time
              dateTime={entry.date}
              className="mb-2 block text-xs text-(--prose-3)"
            >
              {formattedDate}
            </time>
            <div className="inline-flex h-7 items-center justify-center rounded-md border border-(--outline) bg-(--surface) px-2 font-mono text-xs font-bold tabular-nums text-(--prose)">
              v{entry.version}
            </div>
          </div>
        </div>

        <div className="relative flex-1 border-l border-(--outline) pb-10 pl-4 md:border-l-0 md:pl-6">
          <div
            className="pointer-events-none absolute top-1.5 left-0 hidden h-[calc(100%-0.375rem)] w-px bg-(--outline) md:block group-last:h-8"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute top-1.5 left-0 hidden size-2.5 -translate-x-1/2 rounded-full bg-(--accent) ring-[3px] ring-(--bg) md:block"
            aria-hidden
          />

          <div className="space-y-3">
            <h2 className="text-balance font-display text-xl font-bold tracking-tight text-(--prose)">
              {entry.title}
            </h2>

            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex h-5 items-center rounded-full border border-(--outline) bg-(--surface-raised) px-2 text-[10px] font-semibold tracking-wider text-(--prose-3) uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div>
              {entry.content.map((section, i) => (
                <SectionBlock key={`${entry.version}-${i}`} section={section} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function WhatsNewScreen() {
  const changelog = getWhatsNew();

  return (
    <div className="mx-auto max-w-3xl px-1 py-2 sm:px-0">
      <header className="mb-8 space-y-2 text-center md:mb-10">
        <h1 className="font-display text-2xl font-bold tracking-tight text-(--prose) sm:text-3xl">
          What&apos;s new
        </h1>
        <p className="mx-auto max-w-[50ch] text-sm text-(--prose-3) text-pretty">
          Player-facing highlights from each release. Engineering detail lives
          on GitHub Releases.
        </p>
      </header>

      <div className="relative space-y-2">
        {changelog.map((entry) => (
          <div key={`${entry.version}-${entry.title}`} className="group">
            <EntryCard entry={entry} />
          </div>
        ))}
      </div>

      <p className="mt-2 border-t border-(--outline) pt-6 text-center text-xs text-(--prose-3)">
        Full notes on{' '}
        <a
          className="underline"
          href="https://github.com/jondmarien/rngdle-unlocked/releases"
          target="_blank"
          rel="noreferrer"
        >
          GitHub Releases
        </a>
        {' · '}
        <a className="underline" href="/about">
          About the game
        </a>
      </p>
    </div>
  );
}
