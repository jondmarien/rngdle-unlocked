/**
 * Player-facing “What’s new” copy for About.
 * Keep this human and product-oriented — developer detail lives in CHANGELOG.md.
 */

export type WhatsNewEntry = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: '0.6.0',
    date: '2026-07-09',
    title: 'Best Roll board & Features tab',
    highlights: [
      'Leaderboard Best Roll — see who hit the highest single roll by EP or by rarity (Ranked and Practice).',
      'Total EP board is unchanged; switch views with the new toggle.',
      'New Features tab — submit ideas, upvote others, and track status as requests move along.',
    ],
  },
  {
    version: '0.5.1',
    date: '2026-07-09',
    title: 'Richer link previews & What’s new',
    highlights: [
      'Sharing links like /leaderboard or /about now shows a proper preview card in Discord and other apps.',
      'About has a What’s new section with player-friendly release highlights.',
      'Browser tab titles update as you move between pages.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-07-09',
    title: 'Under the hood',
    highlights: [
      'Big reliability pass so Ranked and cloud features stay solid as the game grows.',
      'Safer save import and cloud sync checks — corrupt or cloned progress is caught earlier.',
      'Same game rules and boards as before; this release is mostly invisible polish for players.',
    ],
  },
  {
    version: '0.4.1',
    date: '2026-07-09',
    title: 'Latest runs, celebrate FX & accounts',
    highlights: [
      'Latest runs panel on Roll — peek your last Free, Ranked, and Challenge numbers.',
      'Bigger celebrate moments for epic / anomaly / mythic rolls (toggle in Settings).',
      'Continue with Discord or GitHub, plus email verification for new email sign-ups.',
      'Admin tools for moderators; Terms and Privacy pages for OAuth apps.',
      'Fixed the reel getting stuck on ????? after switching Daily/Weekly back to Free.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-07-09',
    title: 'Ranked free play & dual boards',
    highlights: [
      'New Ranked mode — server rolls for fair competition, crowns, and overtake alerts.',
      'Two leaderboards: Ranked (competitive) and Practice (synced Free play).',
      'Absolute Ceiling jackpot chance and ultra-rare badge art.',
      'Feed, follows, alerts, richer profiles, and a clearer Codex with unlock times.',
      'Free play stays unlimited and offline-friendly — it just won’t claim community crowns.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-09',
    title: 'Social wave & clearer roll UI',
    highlights: [
      'Share links wait for cloud confirm so Discord previews actually work.',
      'Follow friends, browse the Feed, and see yourself highlighted on the board.',
      'Daily and Weekly challenge modes, optional “Prove this roll” seals, and OG images.',
      'Codex encyclopedia, Stats calendar, and a more readable Roll mode picker.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-09',
    title: 'Accounts & cloud sync',
    highlights: [
      'Optional accounts with @username and merge-safe cloud sync.',
      'Leaderboards and public profiles — play solo forever, or join the board when you want.',
      'Unlimited 0–1,000,000 rolls with badges, EP, history, and showcase from day one.',
    ],
  },
];
