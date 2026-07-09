export type TabId =
  | "home"
  | "history"
  | "collection"
  | "showcase"
  | "stats"
  | "leaderboard"
  | "notifications"
  | "account"
  | "about"
  | "admin"
  | "settings";

/** Canonical path for each main tab (SPA, History API). */
export const TAB_PATH: Record<TabId, string> = {
  home: "/",
  history: "/history",
  collection: "/collection",
  showcase: "/showcase",
  stats: "/stats",
  leaderboard: "/leaderboard",
  notifications: "/notifications",
  account: "/account",
  about: "/about",
  admin: "/admin",
  settings: "/settings",
};

const PATH_TO_TAB: Record<string, TabId> = {
  "": "home",
  roll: "home",
  history: "history",
  collection: "collection",
  showcase: "showcase",
  stats: "stats",
  leaderboard: "leaderboard",
  board: "leaderboard",
  notifications: "notifications",
  alerts: "notifications",
  account: "account",
  about: "about",
  admin: "admin",
  settings: "settings",
};

export type AppRoute =
  | { kind: "tab"; tab: TabId }
  | { kind: "profile"; username: string }
  | { kind: "roll"; rollId: string; username?: string };

export function parsePath(pathname: string): AppRoute {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "u" && parts[1]) {
    return {
      kind: "profile",
      username: decodeURIComponent(parts[1]).toLowerCase(),
    };
  }
  // Vanity share: /s/:username/:code
  if (parts[0] === "s" && parts[1] && parts[2]) {
    return {
      kind: "roll",
      username: decodeURIComponent(parts[1]).toLowerCase(),
      rollId: decodeURIComponent(parts[2]),
    };
  }
  // Legacy: /r/:uuid-or-code
  if (parts[0] === "r" && parts[1]) {
    return { kind: "roll", rollId: decodeURIComponent(parts[1]) };
  }
  if (parts.length === 0) {
    return { kind: "tab", tab: "home" };
  }
  if (parts.length === 1 && PATH_TO_TAB[parts[0]]) {
    return { kind: "tab", tab: PATH_TO_TAB[parts[0]] };
  }
  return { kind: "tab", tab: "home" };
}

export function tabPath(tab: TabId): string {
  return TAB_PATH[tab];
}

/** Human + Discord-facing vanity path (no /api). */
export function vanityRollPath(
  username: string | null | undefined,
  code: string,
): string {
  const user = (username ?? "player")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  const handle = user.length >= 3 ? user : "player";
  return `/s/${encodeURIComponent(handle)}/${encodeURIComponent(code)}`;
}
