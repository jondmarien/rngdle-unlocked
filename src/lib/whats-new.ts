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
    title: 'Share seals, Features board upgrades',
    date: '2026-07-10',
    version: '0.11.1',
    tags: ['Share', 'Features', 'UI'],
    content: [
      {
        body: 'Discord shares can list your unlocked seals, the Features board got categories / edit / screenshots, and a handful of polish fixes landed.',
      },
      {
        heading: 'What you will notice',
        body: 'More expressive shares and a clearer Features tab.',
        bullets: [
          '**Unlocked seals on share** — Settings toggle (on by default) adds journey / secret / mastery seal names to Discord paste + share PNG; profile OG supports seals too.',
          '**Roll count on by default** — new installs show roll count on shares; existing opt-outs stay off.',
          '**Features tags + edit** — categorize requests, edit your own title/description/tag, and attach an optional screenshot.',
          '**Badge art lightbox** — tap badge art on Profile or Codex for a full-size view.',
          '**Latest runs eye sticks** — spoiler blur preference survives refresh; journey unlock toasts show the right badge art.',
          '**Alerts links** — system messages use matching open labels (What’s new, profile, Features) instead of always saying Open roll.',
        ],
      },
    ],
  },
  {
    title: 'Lighter cloud sync + Discord share cards',
    date: '2026-07-10',
    version: '0.11.0',
    tags: ['Sync', 'Share', 'Reliability'],
    content: [
      {
        body: 'Cloud sync no longer uploads your entire roll history on every Generate — only what changed — and Discord share previews show the PNG card again.',
      },
      {
        heading: 'What you will notice',
        body: 'Same game, quieter network.',
        bullets: [
          '**Smarter sync** — signed-in rolls push small updates instead of re-sending hundreds of past rolls each time.',
          '**Pull from cloud** — Account pull merges your devices without a wasteful full re-upload.',
          '**Discord embeds** — sharing a roll or profile should show the image card in Discord again (not a blank preview).',
          '**Quota protection** — oversized sync payloads are rejected cleanly so one heavy session cannot melt the database transfer budget.',
        ],
      },
    ],
  },
  {
    title: 'Friends on the Board',
    date: '2026-07-10',
    version: '0.10.2',
    tags: ['Friends', 'Board', 'Social'],
    content: [
      {
        body: 'Filter Ranked and Practice to people you follow, and manage that list on a dedicated Friends tab.',
      },
      {
        heading: 'What you will notice',
        body: 'Same follow graph as Feed — no new friend requests.',
        bullets: [
          '**Circle → Friends** — on Ranked / Practice, show only you and players you follow (sign-in required).',
          '**Friends tab** — see avatars, flair, and lifetime EP; unfollow in one tap.',
          '**Find still finds** — search @usernames from Board → Find, then watch them on Feed and Friends boards.',
        ],
      },
    ],
  },
  {
    title: 'Profile polish + streak seal fix',
    date: '2026-07-10',
    version: '0.10.1',
    tags: ['Profile', 'Secrets', 'UI'],
    content: [
      {
        body: 'Profiles lead with your highest Journey badge (expand to see the rest), put Best roll above secrets, keep Codex collapsed until you open it, show streak secrets in their own section, and Home unlock toasts finally show the right streak seal art.',
      },
      {
        heading: 'What you will notice',
        body: 'Small profile and celebration fixes on top of 0.10.0.',
        bullets: [
          '**Journey on profiles** — latest milestone by default; tap to show every earned journey badge.',
          '**Best roll** — sits at the top of the badge stack, above Journey.',
          '**Secret badges** — Very Odd and friends appear on public profiles (separate from section masteries).',
          '**Codex unlocks** — collapsed by default; expand when you want the full list.',
          '**Streak unlock toast** — Home celebration uses the real seal image again.',
        ],
      },
    ],
  },
  {
    title: 'Bases, cats, streak secrets, and The Worst',
    date: '2026-07-10',
    version: '0.10.0',
    tags: ['Badges', 'Codex', 'Secrets', 'Sync'],
    content: [
      {
        body: 'A whole new Bases family, meme cat / Ultimeme badges, streak secrets for odd/even runs and Giant Numbers, plus The Worst — the joke badge for a perfectly mediocre EP sum. More badge cards show math proofs too.',
      },
      {
        heading: 'What you will notice',
        body: 'New badges and secrets only; past rolls keep their old scoring.',
        bullets: [
          '**Bases** — hex, binary, and bit-pattern badges, capped by the **Radix Crown** section seal.',
          '**Cat & Ultimeme** — from `:3` up through Felis Catus and the classic 69420 / 42069 stack.',
          '**Streak secrets** — Very Odd / Extremely Odd / Uneven / Very Uneven, plus **Giant Numbers** when your last five rolls are huge.',
          '**The Worst** — hit when your other badges sum to exactly 1,758 EP (yes, really).',
          '**Badge proofs** — primes, Fibonacci, and Twin Gate Prime show equations on the card.',
        ],
      },
    ],
  },
  {
    title: 'Divine rarity, sharper poker hands, badge proofs',
    date: '2026-07-10',
    version: '0.9.0',
    tags: ['Rarity', 'Badges', 'Poker', 'UI'],
    content: [
      {
        body: 'A new top rarity above Mythic, fairer poker scoring for rare digit shapes, and math proofs on more badge cards — plus a spoiler toggle on Latest Runs.',
      },
      {
        heading: 'What you will notice',
        body: 'New rolls only for scoring changes; past history stays as it was.',
        bullets: [
          '**Divine** sits above Mythic for ultra-high EP rolls (gold treatment, bigger celebration).',
          '**Poker hands** — Two Trips, Three Pair, and Full Quads score shapes that used to under-count.',
          '**Badge proofs** — divisibility, powers, pronic, and digit-sum cards show the equation under the description.',
          '**Latest Runs** — optional eye toggle blurs numbers / rarity / EP so you can keep rolling spoiler-free.',
        ],
      },
    ],
  },
  {
    title: 'Checklist that checks, challenge timers',
    date: '2026-07-10',
    version: '0.8.1',
    tags: ['UI', 'Account', 'Challenge', 'Sync'],
    content: [
      {
        body: 'The signed-in Getting started list now notices when you actually try Ranked, unlock Journey, or upvote on Features — and Daily / Weekly lock screens tell you when the next roll unlocks.',
      },
      {
        heading: 'What you will notice',
        body: 'Small fixes that make Home feel finished after the 0.8.0 polish pass.',
        bullets: [
          '**Onboarding checklist** strikes through Ranked, Journey, and Features after you do those things (not only username).',
          '**Daily / Weekly locked** copy shows a live **Resets in …** countdown to the next UTC reset.',
          '**Cloud sync** keeps Ranked roll labels when progress pulls from the server; large histories no longer false-reject sync.',
        ],
      },
    ],
  },
  {
    title: 'Smoother boards, clearer onboarding',
    date: '2026-07-10',
    version: '0.8.0',
    tags: ['UI', 'Board', 'Account', 'A11y'],
    content: [
      {
        body: 'A polish pass across Home, Board, Feed, History, and Account — easier to get started when signed in, and easier to recover when a load fails.',
      },
      {
        heading: 'What you will notice',
        body: 'Small quality-of-life upgrades without changing how Free play, Ranked, or Arcade score.',
        bullets: [
          '**Signed-in checklist** on Home: set a username, sync, try Ranked — dismiss anytime.',
          '**Retry** when Board, Feed, Features, or Arcade fail to load.',
          '**Shared roll rows** with relative times and Free / Ranked / Challenge lane chips.',
          '**Search** in History and Features; clearer empty Board states.',
          '**Keyboard & focus** polish on segmented toggles and icon buttons.',
        ],
      },
    ],
  },
  {
    title: 'Search the Badge Codex',
    date: '2026-07-09',
    version: '0.7.4',
    tags: ['UI', 'Collection'],
    content: [
      {
        body: 'Find badges faster in the Codex with a search box above the section tabs — without spoiling locked names.',
      },
      {
        heading: 'How it works',
        body: 'Type to filter within the tab you already picked (All, Math, Journey, and so on).',
        bullets: [
          '**Unlocked**: matches badge name and description.',
          '**Locked**: only matches the placeholder text you already see — true hidden names stay hidden.',
          '**Clear**: tap × to reset; empty search shows the same list as before.',
        ],
      },
    ],
  },
  {
    title: 'Journey milestones get custom seals',
    date: '2026-07-09',
    version: '0.7.3',
    tags: ['UI', 'Collection', 'Profile'],
    content: [
      {
        body: 'Every lifetime Journey mark — from First Steps to Centurion — now has its own illustrated seal, matching the look of Secret masteries.',
      },
      {
        heading: 'Where to see them',
        body: 'Collection and public profiles show the new art for milestones you have earned.',
        bullets: [
          '**Collection**: Journey cards use the seal art; locked marks still hide the name as `????`.',
          '**Profile**: a dedicated Journey badges section lists unlocked seals (before Secret masteries).',
          '**Unchanged**: roll thresholds and life EP rewards stay the same — this is art only.',
        ],
      },
    ],
  },
  {
    title: 'See your Ranked rolls left',
    date: '2026-07-09',
    version: '0.7.2',
    tags: ['UI', 'Ranked'],
    content: [
      {
        body: 'Ranked mode now shows how many server rolls you have left in the current hour window — before you hit the soft cap.',
      },
      {
        heading: 'On Home',
        body: 'When Ranked is selected, a small pill tracks remaining rolls and when the window refreshes.',
        bullets: [
          '**Count**: `N/90 left` updates after each Ranked roll.',
          '**Reset**: `resets in Xm` when a window is active — not a clock-hour reset.',
          '**Low remaining**: subtle amber when you are down to 10 or fewer.',
        ],
      },
    ],
  },
  {
    title: 'Clearer Alerts and Features',
    date: '2026-07-10',
    version: '0.7.1',
    tags: ['UI', 'Alerts', 'Features'],
    content: [
      {
        body: 'Notifications and the Features board are easier to scan — less duplicate crown noise, clearer status, same underlying data.',
      },
      {
        heading: 'Alerts',
        body: 'Activity and System messages show type at a glance, with unread weight and relative times.',
        bullets: [
          '**One crown event**: today / week / all-time overtake or community crown notices from the same roll collapse into a single card with period tags.',
          '**Unread counts**: the Alerts badge matches the cards you see, not three rows for one moment.',
          '**System density**: headline first; stats and badge detail stay secondary.',
        ],
      },
      {
        heading: 'Features',
        body: 'Status colors are dedicated to the Features board (not badge rarity).',
        bullets: [
          '**Active vs archive**: open requests stay up top; Shipped and Declined fold under their own headers (always listed, even at zero).',
          '**Closed votes**: shipped and declined show the final upvote count without a live vote button.',
        ],
      },
    ],
  },
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
