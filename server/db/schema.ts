import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/** Better Auth — user */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  /** Public handle for profiles / leaderboards */
  username: text('username').unique(),
  /** Profile vanity: accent key (teal, violet, amber, rose, sky, emerald, mono) */
  profileAccent: text('profile_accent').notNull().default('teal'),
  /** Short public bio (max ~160 chars enforced in API) */
  profileBio: text('profile_bio').notNull().default(''),
  /** Optional flair line under display name */
  profileFlair: text('profile_flair').notNull().default(''),
  /** Preset avatar id from catalog (empty = letter / OAuth image) */
  profileAvatar: text('profile_avatar').notNull().default(''),
  /** When true, public /u profile shows unlocked codex badges */
  profileShowCodex: boolean('profile_show_codex').notNull().default(true),
  /** Better Auth admin plugin — never accept from client signup (`input: false`) */
  role: text('role').notNull().default('user'),
  banned: boolean('banned').notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** Better Auth admin plugin — set when an admin impersonates */
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Cloud save blob + counters */
export const userProgress = pgTable('user_progress', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  lifetimeEp: integer('lifetime_ep').notNull().default(0),
  lifetimeRollCount: integer('lifetime_roll_count').notNull().default(0),
  journeyEp: integer('journey_ep').notNull().default(0),
  collectionJson: text('collection_json').notNull().default('[]'),
  statsJson: text('stats_json').notNull().default('{}'),
  settingsJson: text('settings_json').notNull().default('{}'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/** Individual rolls (for history + future leaderboards) */
export const rolls = pgTable('rolls', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  totalEp: integer('total_ep').notNull(),
  rarity: text('rarity').notNull(),
  percentile: real('percentile').notNull(),
  badgesJson: text('badges_json').notNull().default('[]'),
  rolledAt: timestamp('rolled_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Public share page / OG */
  isPublic: boolean('is_public').notNull().default(true),
  /** Short vanity code for /s/:user/:code */
  shortCode: text('short_code').unique(),
  /** Optional HMAC seal from POST /api/attest */
  attestationSeal: text('attestation_seal'),
  attestedAt: timestamp('attested_at'),
  /** Challenge period key when rolled in challenge mode (e.g. daily:2026-07-08) */
  challengeKey: text('challenge_key'),
  /**
   * Provenance for competitive surfaces:
   * - client: local free play (synced; not ranked)
   * - ranked: server CSPRNG free play (leaderboard / community crowns)
   * - challenge: daily/weekly seed rolls
   */
  source: text('source').notNull().default('client'),
});

/** Social graph — follower follows following */
export const follows = pgTable(
  'follows',
  {
    followerId: text('follower_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] })],
);

/**
 * Per-user inbox (activity: follows, future board events, etc.).
 * System broadcasts live in `system_messages` and are merged client-side by tab.
 */
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** follow | badge_unlock | secret_mastery | overtaken | … */
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  href: text('href'),
  actorUsername: text('actor_username'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Developer / ops broadcasts shown in every account under System Messages. */
export const systemMessages = pgTable('system_messages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Per-user read receipts for system broadcasts */
export const systemMessageReads = pgTable(
  'system_message_reads',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    messageId: text('message_id')
      .notNull()
      .references(() => systemMessages.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.messageId] })],
);

/** Fixed-window rate limit counters (serverless-safe). */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start').notNull(),
  count: integer('count').notNull().default(0),
});

/** User-filed abuse / username reports (admins resolve). */
export const userReports = pgTable('user_reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  targetUserId: text('target_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  /** open | resolved | dismissed */
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  resolvedBy: text('resolved_by').references(() => user.id, {
    onDelete: 'set null',
  }),
  resolvedAt: timestamp('resolved_at'),
});

/** Immutable-ish admin action trail for destructive / privileged ops. */
export const adminAuditLog = pgTable('admin_audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  metaJson: text('meta_json').notNull().default('{}'),
  ip: text('ip'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Player feature requests (Features tab).
 * status: submitted | under_review | planned | in_progress | shipped | declined
 */
export const featureRequests = pgTable('feature_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('submitted'),
  /**
   * Optional category: bug_fix | new_feature | change | badge_update.
   * Null = Uncategorized (legacy rows).
   */
  tag: text('tag'),
  /** Public Vercel Blob URL for an attached screenshot/mockup. */
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** One upvote per user per feature request (PK blocks double votes). */
export const featureRequestVotes = pgTable(
  'feature_request_votes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requestId: text('request_id')
      .notNull()
      .references(() => featureRequests.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.requestId] })],
);

/**
 * Arcade Mode — permanent meta-progression (Digits economy; never EP).
 * Isolated from rolls / user_progress.
 */
export const arcadeMeta = pgTable('arcade_meta', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** JSON string[] of ArcadeUpgradeId */
  unlockedUpgradeIds: text('unlocked_upgrade_ids').notNull().default('[]'),
  totalRunsCompleted: integer('total_runs_completed').notNull().default(0),
  bestRunScore: integer('best_run_score').notNull().default(0),
  lifetimeDigitsCashed: integer('lifetime_digits_cashed').notNull().default(0),
  /** Claimed idle Digits waiting to seed the next run. */
  idleDigitsBank: integer('idle_digits_bank').notNull().default(0),
  /** Server accrual anchor — never accept from client. */
  lastIdleClaimAt: timestamp('last_idle_claim_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Arcade run session. status: active | cashed | busted (abandon → busted).
 * Digits / peak / owned upgrades live here — not on rolls.
 */
export const arcadeRuns = pgTable('arcade_runs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** active | cashed | busted */
  status: text('status').notNull().default('active'),
  digits: integer('digits').notNull().default(0),
  peakDigits: integer('peak_digits').notNull().default(0),
  rollCount: integer('roll_count').notNull().default(0),
  /** Consecutive non-trash for combo_chain passive (not a bust counter). */
  comboStreak: integer('combo_streak').notNull().default(0),
  /** JSON ArcadeUpgradeId[] — unique, no stacking */
  ownedUpgradesJson: text('owned_upgrades_json').notNull().default('[]'),
  /** JSON Record<upgradeId, rollsRemaining> */
  cooldownsJson: text('cooldowns_json').notNull().default('{}'),
  surgeRollsRemaining: integer('surge_rolls_remaining').notNull().default(0),
  /** JSON pending actives: { donArmed?, rarityLockArmed?, skipShopOnce? } */
  pendingActiveJson: text('pending_active_json').notNull().default('{}'),
  /** JSON ShopOffer[] */
  shopOfferJson: text('shop_offer_json').notNull().default('[]'),
  /** Set on end: peak (bust/abandon) or digits (cash-out) */
  runScore: integer('run_score'),
  /** Deadline upgrade: target Digits (0 = inactive). */
  deadlineTargetDigits: integer('deadline_target_digits').notNull().default(0),
  /** Deadline upgrade: rolls left to hit target (0 = inactive). */
  deadlineRollsRemaining: integer('deadline_rolls_remaining')
    .notNull()
    .default(0),
  /** Consecutive trash rolls (soft-fail counter; not comboStreak). */
  trashStreak: integer('trash_streak').notNull().default(0),
  /** Digits gains halved for this many rolls after soft-fail. */
  softFailRollsRemaining: integer('soft_fail_rolls_remaining')
    .notNull()
    .default(0),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
});

/** Per-roll audit trail inside an Arcade run (not the public rolls table). */
export const arcadeRunRolls = pgTable('arcade_run_rolls', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => arcadeRuns.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  totalEp: integer('total_ep').notNull(),
  rarity: text('rarity').notNull(),
  badgesJson: text('badges_json').notNull().default('[]'),
  digitsAwarded: integer('digits_awarded').notNull().default(0),
  rolledAt: timestamp('rolled_at').notNull().defaultNow(),
});
