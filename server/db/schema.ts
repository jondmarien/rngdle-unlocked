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
 * status: submitted | under_review | planned | shipped | declined
 */
export const featureRequests = pgTable('feature_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('submitted'),
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
