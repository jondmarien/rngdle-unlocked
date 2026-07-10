/**
 * Player-facing What’s new chronicle.
 * Keep human and product-oriented — developer detail lives in CHANGELOG.md.
 *
 * Layout inspiration: CTFD live scoreboard Chronicle (timeline + tags + sections),
 * restyled for RNGdle Unlocked tokens (Outfit / Syne, not fantasy amber).
 */

export type WhatsNewSection = {
  heading?: string;
  body: string;
  bullets?: string[];
};

export type WhatsNewEntry = {
  title: string;
  date: string;
  version: string;
  tags: string[];
  content: WhatsNewSection[];
};

/** @deprecated Prefer section bullets; kept for simple list consumers. */
export function entryHighlightLines(entry: WhatsNewEntry): string[] {
  const lines: string[] = [];
  for (const section of entry.content) {
    if (section.bullets?.length) lines.push(...section.bullets);
    else if (section.body) lines.push(section.body);
  }
  return lines;
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    title: 'Arcade Mode and a clearer Board',
    date: '2026-07-09',
    version: '0.7.0',
    tags: ['Feature', 'Arcade', 'Board'],
    content: [
      {
        body: 'A new Digits run mode with upgrades and cash-out, plus Leaderboard tabs that put Ranked, Practice, and Arcade first.',
      },
      {
        heading: 'Arcade',
        body: 'Separate from Free / Daily / Ranked — Digits never become EP.',
        bullets: [
          '**Runs**: roll, buy upgrades, cash out, or bust on Double or Nothing.',
          '**Meta unlocks**: complete runs and chase high scores to expand the shop.',
          '**Board**: Leaderboard → Arcade ranks best Digits run.',
        ],
      },
      {
        heading: 'Leaderboard',
        body: 'Primary tabs are now Ranked | Practice | Arcade | Feed | Find.',
        bullets: [
          '**Less clutter**: metric + sort collapse into one control; period stays secondary.',
          '**Feed and Find**: same behavior, re-homed under the new tabs.',
        ],
      },
    ],
  },
  {
    title: 'Best Roll, Features, and clearer About',
    date: '2026-07-09',
    version: '0.6.0',
    tags: ['Feature', 'Board', 'Privacy'],
    content: [
      {
        body: 'Biggest single rolls on the board, a Features tab for ideas, and About copy that matches how rarity and accounts actually work.',
      },
      {
        heading: 'Best Roll',
        body: 'Leaderboard now has a Best Roll view beside Total EP.',
        bullets: [
          '**By EP or rarity**: one personal best per player on Ranked and Practice.',
          '**All-time or week**: same period chips as the Total EP board.',
          '**Total EP unchanged**: switch views with the new toggle; sums stay where they were.',
        ],
      },
      {
        heading: 'Features tab',
        body: 'Submit ideas, upvote others, and watch status move as requests get reviewed.',
        bullets: [
          '**Signed-in requests**: describe a feature; soft hourly submit limits apply.',
          '**Upvotes**: bump ideas you want shipped; admins set status (planned, in progress, shipped, declined, and more).',
        ],
      },
      {
        heading: 'About & account safety',
        body: 'Rarity ladders, single-digit odds, and self-serve cloud account deletion.',
        bullets: [
          '**Number vs badge rarity**: EP + score percentile for rolls; chip EP weight for badges (not hit-rate tables).',
          '**Single digits**: 1–9 are in range; a 2 can stack to Mythic under our catalog.',
          '**Delete account**: Account → email confirm. Local saves stay until you clear site data.',
          "**What's new page**: release chronicle at /whats-new (timeline + tags), not buried only inside About.",
        ],
      },
    ],
  },
  {
    title: 'Richer link previews',
    date: '2026-07-09',
    version: '0.5.1',
    tags: ['Share', 'UI'],
    content: [
      {
        body: 'Public routes pick up proper preview cards when you paste them into Discord and similar apps.',
        bullets: [
          '**Route OG cards**: /leaderboard, /about, and friends get branded embeds.',
          '**Tab titles**: the browser title tracks the page you are on.',
          "**What's new**: player-friendly release highlights (now on their own /whats-new timeline).",
        ],
      },
    ],
  },
  {
    title: 'Under the hood',
    date: '2026-07-09',
    version: '0.5.0',
    tags: ['Reliability'],
    content: [
      {
        body: 'Reliability pass so Ranked and cloud stay solid as the game grows. Same rules and boards for players.',
        bullets: [
          '**Safer import & sync**: corrupt or cloned progress is caught earlier.',
          '**Invisible polish**: architecture work that should not change how Free or Ranked feel to roll.',
        ],
      },
    ],
  },
  {
    title: 'Latest runs, celebrate FX & accounts',
    date: '2026-07-09',
    version: '0.4.1',
    tags: ['Feature', 'UI', 'Auth'],
    content: [
      {
        body: 'Home got a latest-runs peek, bigger celebrate moments, and clearer account options.',
        bullets: [
          '**Latest runs**: last Free, Ranked, and Challenge numbers on Roll.',
          '**Celebrate FX**: optional bigger moments for epic / anomaly / mythic (Settings toggle).',
          '**Sign-in**: Continue with Discord or GitHub; email signup needs verification.',
          '**Reel fix**: Generate no longer stuck on ????? after Daily/Weekly → Free.',
          '**Legal**: Terms and Privacy for OAuth apps; admin tools for moderators.',
        ],
      },
    ],
  },
  {
    title: 'Ranked free play & dual boards',
    date: '2026-07-09',
    version: '0.4.0',
    tags: ['Feature', 'Ranked', 'Board'],
    content: [
      {
        body: 'Competitive Free play landed with server RNG, crowns, and a Practice board for honor-system sync.',
        bullets: [
          '**Ranked**: server-issued rolls, crowns, and overtake alerts.',
          '**Practice**: synced Free play on its own board.',
          '**Absolute Ceiling**: jackpot chance plus ultra-rare badge art.',
          '**Social**: feed, follows, alerts, richer profiles, Codex unlock times.',
          '**Free play**: still unlimited and offline-friendly; it does not claim community crowns.',
        ],
      },
    ],
  },
  {
    title: 'Social wave & clearer roll UI',
    date: '2026-07-09',
    version: '0.3.0',
    tags: ['Feature', 'Social', 'UI'],
    content: [
      {
        body: 'Share links that actually resolve, friends on the feed, and clearer Daily / Weekly modes.',
        bullets: [
          '**Cloud-ready shares**: vanity links wait for confirm so Discord previews work.',
          '**Follow + Feed**: browse friends and see yourself on the board.',
          '**Challenges & seals**: Daily / Weekly, optional Prove this roll, OG images.',
          '**Codex & Stats**: encyclopedia, streak calendar, clearer mode picker.',
        ],
      },
    ],
  },
  {
    title: 'Accounts & cloud sync',
    date: '2026-07-09',
    version: '0.2.0',
    tags: ['Launch', 'Sync'],
    content: [
      {
        body: 'Optional cloud identity without forcing it: solo forever, or join the board when you want.',
        bullets: [
          '**@username**: profiles and leaderboards when you opt in.',
          '**Merge-safe sync**: local + cloud without blind overwrite.',
          '**Core game**: unlimited 0–1,000,000 rolls with badges, EP, history, and showcase.',
        ],
      },
    ],
  },
];

export function getWhatsNew(): WhatsNewEntry[] {
  return WHATS_NEW;
}
