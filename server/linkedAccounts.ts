import { eq } from "drizzle-orm";
import type { Db } from "./db/index.js";
import { account } from "./db/schema.js";
import { createLogger } from "./logger.js";

const log = createLogger("linked-accounts");

export type LinkedProviderInfo = {
  providerId: "discord" | "github";
  accountId: string;
  /** Human label e.g. Discord username or GitHub login */
  label: string;
};

async function discordLabel(
  accessToken: string | null | undefined,
  accountId: string,
): Promise<string> {
  if (!accessToken) return `Discord · ${accountId}`;
  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return `Discord · ${accountId}`;
    const data = (await res.json()) as {
      username?: string;
      global_name?: string | null;
      discriminator?: string;
    };
    if (data.global_name) return data.global_name;
    if (data.username) {
      const disc =
        data.discriminator && data.discriminator !== "0"
          ? `#${data.discriminator}`
          : "";
      return `${data.username}${disc}`;
    }
  } catch (e) {
    log.debug("discord label fetch failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  return `Discord · ${accountId}`;
}

async function githubLabel(
  accessToken: string | null | undefined,
  accountId: string,
): Promise<string> {
  if (!accessToken) return `GitHub · ${accountId}`;
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "rngdle-unlocked",
      },
    });
    if (!res.ok) return `GitHub · ${accountId}`;
    const data = (await res.json()) as {
      login?: string;
      name?: string | null;
    };
    if (data.login) return data.login;
    if (data.name) return data.name;
  } catch (e) {
    log.debug("github label fetch failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  return `GitHub · ${accountId}`;
}

/**
 * Linked Discord / GitHub rows for the signed-in user (no secrets returned).
 */
export async function getLinkedSocialAccounts(
  db: Db,
  userId: string,
): Promise<LinkedProviderInfo[]> {
  const rows = await db
    .select({
      providerId: account.providerId,
      accountId: account.accountId,
      accessToken: account.accessToken,
    })
    .from(account)
    .where(eq(account.userId, userId));

  const out: LinkedProviderInfo[] = [];
  for (const row of rows) {
    if (row.providerId === "discord") {
      out.push({
        providerId: "discord",
        accountId: row.accountId,
        label: await discordLabel(row.accessToken, row.accountId),
      });
    } else if (row.providerId === "github") {
      out.push({
        providerId: "github",
        accountId: row.accountId,
        label: await githubLabel(row.accessToken, row.accountId),
      });
    }
  }
  return out;
}
