import {
  boolean,
  integer,
  pgTable,
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
});

/** Fixed-window rate limit counters (serverless-safe). */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start').notNull(),
  count: integer('count').notNull().default(0),
});
