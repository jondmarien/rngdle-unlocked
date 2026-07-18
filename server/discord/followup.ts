/**
 * Edit deferred interaction responses via Discord webhook token
 * (works without the bot being a guild member).
 */
import { createLogger } from '../logger.js';

const log = createLogger('discord-followup');

const API = 'https://discord.com/api/v10';

export async function editOriginalInteraction(opts: {
  applicationId: string;
  interactionToken: string;
  body: { content?: string | null; components?: unknown[]; flags?: number };
}): Promise<void> {
  const url = `${API}/webhooks/${opts.applicationId}/${opts.interactionToken}/messages/@original`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts.body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.warn('edit original failed', {
      status: res.status,
      text: text.slice(0, 200),
    });
  }
}

export async function postFollowup(opts: {
  applicationId: string;
  interactionToken: string;
  body: {
    content?: string;
    components?: unknown[];
    flags?: number;
  };
}): Promise<void> {
  const url = `${API}/webhooks/${opts.applicationId}/${opts.interactionToken}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts.body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.warn('followup failed', {
      status: res.status,
      text: text.slice(0, 200),
    });
  }
}
