/**
 * Discord Components V2 builders for Ranked Plus bot roll / board screens.
 */
import type { RollResult } from '../../src/game/types.js';
import { SITE_ORIGIN } from './identity.js';

export const IS_COMPONENTS_V2 = 1 << 15;

export type DiscordMode = 'free' | 'ranked' | 'daily' | 'weekly';

const RARITY_COLOR: Record<string, number> = {
  common: 0x94a3b8,
  uncommon: 0x34d399,
  rare: 0x60a5fa,
  epic: 0xa78bfa,
  legendary: 0xfbbf24,
  mythic: 0xf472b6,
  absolute: 0xf97316,
};

export function rarityAccent(rarity: string | undefined): number {
  return RARITY_COLOR[rarity ?? 'common'] ?? 0x5865f2;
}

function text(content: string) {
  return { type: 10, content };
}

function separator() {
  return { type: 14, divider: true, spacing: 1 };
}

function container(accent: number | null, children: unknown[]) {
  return {
    type: 17,
    ...(accent != null ? { accent_color: accent } : {}),
    components: children,
  };
}

function actionRow(components: unknown[]) {
  return { type: 1, components };
}

function button(opts: {
  customId: string;
  label: string;
  style?: number;
  disabled?: boolean;
}) {
  return {
    type: 2,
    style: opts.style ?? 1,
    label: opts.label.slice(0, 80),
    custom_id: opts.customId.slice(0, 100),
    ...(opts.disabled ? { disabled: true } : {}),
  };
}

function modeSelect(mode: DiscordMode) {
  return actionRow([
    {
      type: 3,
      custom_id: 'mode',
      placeholder: 'Roll mode',
      options: (
        [
          ['free', 'Free play'],
          ['ranked', 'Ranked'],
          ['daily', 'Daily'],
          ['weekly', 'Weekly'],
        ] as const
      ).map(([value, label]) => ({
        label,
        value,
        default: value === mode,
      })),
    },
  ]);
}

function modeLabel(mode: DiscordMode): string {
  switch (mode) {
    case 'free':
      return 'Free play';
    case 'ranked':
      return 'Ranked';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    default: {
      const _x: never = mode;
      return _x;
    }
  }
}

export function idleRollScreen(opts: {
  mode: DiscordMode;
  username: string;
  tierLabel: string;
}): { flags: number; components: unknown[] } {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      container(0x5865f2, [
        text(
          `## RNGdle Unlocked\n**@${opts.username}** · ${opts.tierLabel}\nMode: **${modeLabel(opts.mode)}**`,
        ),
        text(
          '_Press **Roll** to generate. Session buttons expire after ~15 minutes._',
        ),
        separator(),
        modeSelect(opts.mode),
        actionRow([
          button({
            customId: `roll:${opts.mode}`,
            label: 'Roll',
            style: 1,
          }),
          button({ customId: 'board', label: 'Leaderboard', style: 2 }),
        ]),
      ]),
    ],
  };
}

export function rollingScreen(opts: { mode: DiscordMode; username: string }): {
  flags: number;
  components: unknown[];
} {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      container(0x64748b, [
        text(
          `## Rolling…\n**@${opts.username}** · ${modeLabel(opts.mode)}\n\n\`? ? ? ? ? ?\``,
        ),
        modeSelect(opts.mode),
        actionRow([
          button({
            customId: `roll:${opts.mode}`,
            label: 'Roll',
            style: 1,
            disabled: true,
          }),
        ]),
      ]),
    ],
  };
}

export function resultScreen(opts: {
  mode: DiscordMode;
  username: string;
  roll: RollResult;
  note?: string;
}): { flags: number; components: unknown[] } {
  const badges =
    opts.roll.badges
      ?.slice(0, 8)
      .map((b) => b.name)
      .join(', ') || '—';
  const shareUrl =
    opts.roll.shortCode != null
      ? `${SITE_ORIGIN}/s/${encodeURIComponent(opts.username)}/${encodeURIComponent(opts.roll.shortCode)}`
      : null;
  const children: unknown[] = [
    text(
      `## ${opts.roll.number.toLocaleString('en-US')}\n**@${opts.username}** · ${modeLabel(opts.mode)} · **${opts.roll.rarity}** · **${opts.roll.totalEP.toLocaleString('en-US')} EP**`,
    ),
    text(`Badges: ${badges}`),
  ];
  if (opts.note) children.push(text(`_${opts.note}_`));
  if (shareUrl) {
    children.push(text(`[Share / Prove](${shareUrl})`));
  }
  children.push(separator(), modeSelect(opts.mode));
  children.push(
    actionRow([
      button({
        customId: `roll:${opts.mode}`,
        label: 'Roll again',
        style: 1,
      }),
      ...(opts.roll.shortCode
        ? [
            button({
              customId: `share:${opts.roll.shortCode}`,
              label: 'Share link',
              style: 3,
            }),
          ]
        : []),
      button({ customId: 'board', label: 'Leaderboard', style: 2 }),
    ]),
  );
  return {
    flags: IS_COMPONENTS_V2,
    components: [container(rarityAccent(opts.roll.rarity), children)],
  };
}

export function boardScreen(opts: {
  scope: 'ranked' | 'practice' | 'alltime';
  page: number;
  lines: string[];
  hasPrev: boolean;
  hasNext: boolean;
}): { flags: number; components: unknown[] } {
  const title =
    opts.scope === 'ranked'
      ? 'Ranked'
      : opts.scope === 'practice'
        ? 'Practice'
        : 'All-Time';
  const body =
    opts.lines.length > 0 ? opts.lines.join('\n') : '_No entries yet._';
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      container(0x0ea5e9, [
        text(`## Leaderboard · ${title}\nPage ${opts.page + 1}\n\n${body}`),
        separator(),
        actionRow([
          {
            type: 3,
            custom_id: 'board_scope',
            placeholder: 'Scope',
            options: (
              [
                ['ranked', 'Ranked'],
                ['practice', 'Practice'],
                ['alltime', 'All-Time'],
              ] as const
            ).map(([value, label]) => ({
              label,
              value,
              default: value === opts.scope,
            })),
          },
        ]),
        actionRow([
          button({
            customId: `board:${opts.scope}:${opts.page - 1}`,
            label: 'Prev',
            style: 2,
            disabled: !opts.hasPrev,
          }),
          button({
            customId: `board:${opts.scope}:${opts.page + 1}`,
            label: 'Next',
            style: 2,
            disabled: !opts.hasNext,
          }),
          button({ customId: 'roll_home', label: 'Back to Roll', style: 1 }),
        ]),
      ]),
    ],
  };
}

export function ephemeralText(content: string) {
  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      content: content.slice(0, 2000),
      flags: 64, // EPHEMERAL
    },
  };
}

export function messageResponse(data: {
  flags: number;
  components: unknown[];
}) {
  return {
    type: 4,
    data,
  };
}

export function updateMessageResponse(data: {
  flags: number;
  components: unknown[];
}) {
  return {
    type: 7, // UPDATE_MESSAGE
    data,
  };
}

export function deferChannelMessage() {
  return { type: 5 }; // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
}

export function deferUpdate() {
  return { type: 6 }; // DEFERRED_UPDATE_MESSAGE
}
