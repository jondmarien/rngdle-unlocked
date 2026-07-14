/** Shared profile vanity accents for /u/:username */

export const PROFILE_ACCENTS = [
  'teal',
  'violet',
  'amber',
  'rose',
  'sky',
  'emerald',
  'mono',
] as const;

export type ProfileAccent = (typeof PROFILE_ACCENTS)[number];

/** Hex values for optional site-wide `--accent` override (light / dark). */
export const PROFILE_ACCENT_CSS: Record<
  ProfileAccent,
  { light: string; dark: string }
> = {
  teal: { light: '#0f766e', dark: '#2dd4bf' },
  violet: { light: '#7c3aed', dark: '#a78bfa' },
  amber: { light: '#d97706', dark: '#fbbf24' },
  rose: { light: '#e11d48', dark: '#fb7185' },
  sky: { light: '#0284c7', dark: '#38bdf8' },
  emerald: { light: '#059669', dark: '#34d399' },
  mono: { light: '#52525b', dark: '#a1a1aa' },
};

/** Apply or clear document `--accent` only — never touches `--feature-*` tokens. */
export function applyDocumentAccent(
  accent: ProfileAccent | null,
  dark: boolean,
): void {
  const root = document.documentElement;
  if (!accent) {
    root.style.removeProperty('--accent');
    return;
  }
  const pair = PROFILE_ACCENT_CSS[accent];
  root.style.setProperty('--accent', dark ? pair.dark : pair.light);
}

export function isProfileAccent(
  v: string | null | undefined,
): v is ProfileAccent {
  return (
    typeof v === 'string' && (PROFILE_ACCENTS as readonly string[]).includes(v)
  );
}

export function normalizeAccent(v: string | null | undefined): ProfileAccent {
  return isProfileAccent(v) ? v : 'teal';
}

/** CSS custom properties + utility classes for a profile shell */
export function accentStyles(accent: ProfileAccent): {
  banner: string;
  chip: string;
  ring: string;
  soft: string;
  label: string;
} {
  const map: Record<
    ProfileAccent,
    { banner: string; chip: string; ring: string; soft: string; label: string }
  > = {
    teal: {
      banner:
        'from-teal-900/80 via-teal-800/40 to-transparent dark:from-teal-950 dark:via-teal-900/50',
      chip: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30',
      ring: 'ring-teal-500/40',
      soft: 'border-teal-500/25 bg-teal-500/5',
      label: 'Teal',
    },
    violet: {
      banner:
        'from-violet-900/80 via-violet-800/40 to-transparent dark:from-violet-950 dark:via-violet-900/50',
      chip: 'bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-500/30',
      ring: 'ring-violet-500/40',
      soft: 'border-violet-500/25 bg-violet-500/5',
      label: 'Violet',
    },
    amber: {
      banner:
        'from-amber-900/70 via-amber-800/35 to-transparent dark:from-amber-950 dark:via-amber-900/40',
      chip: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30',
      ring: 'ring-amber-500/40',
      soft: 'border-amber-500/25 bg-amber-500/5',
      label: 'Amber',
    },
    rose: {
      banner:
        'from-rose-900/80 via-rose-800/40 to-transparent dark:from-rose-950 dark:via-rose-900/50',
      chip: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
      ring: 'ring-rose-500/40',
      soft: 'border-rose-500/25 bg-rose-500/5',
      label: 'Rose',
    },
    sky: {
      banner:
        'from-sky-900/80 via-sky-800/40 to-transparent dark:from-sky-950 dark:via-sky-900/50',
      chip: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
      ring: 'ring-sky-500/40',
      soft: 'border-sky-500/25 bg-sky-500/5',
      label: 'Sky',
    },
    emerald: {
      banner:
        'from-emerald-900/80 via-emerald-800/40 to-transparent dark:from-emerald-950 dark:via-emerald-900/50',
      chip: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
      ring: 'ring-emerald-500/40',
      soft: 'border-emerald-500/25 bg-emerald-500/5',
      label: 'Emerald',
    },
    mono: {
      banner:
        'from-zinc-800/90 via-zinc-700/40 to-transparent dark:from-zinc-950 dark:via-zinc-900/60',
      chip: 'bg-zinc-500/15 text-zinc-800 dark:text-zinc-200 border-zinc-500/30',
      ring: 'ring-zinc-500/40',
      soft: 'border-zinc-500/25 bg-zinc-500/5',
      label: 'Mono',
    },
  };
  return map[accent];
}
