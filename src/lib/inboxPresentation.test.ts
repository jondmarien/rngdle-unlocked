import { describe, expect, it } from 'vite-plus/test';
import type { InboxItem } from './notifications-api';
import {
  countGroupedUnread,
  groupInboxItems,
  inboxOpenLabel,
  parseSystemBody,
  resolveVisualType,
} from './inboxPresentation';

function item(
  partial: Partial<InboxItem> & Pick<InboxItem, 'id' | 'tab'>,
): InboxItem {
  return {
    kind: 'overtaken',
    title: 'title',
    body: 'body',
    href: null,
    actorUsername: 'champ',
    read: false,
    createdAt: '2026-07-09T12:00:00.000Z',
    ...partial,
  };
}

describe('groupInboxItems', () => {
  it('groups overtake periods for the same roll', () => {
    const roll = 'roll-abc';
    const items = [
      item({
        id: `overtake-today-${roll}`,
        tab: 'activity',
        title: "Overtaken — today's best",
        createdAt: '2026-07-09T12:02:00.000Z',
      }),
      item({
        id: `overtake-week-${roll}`,
        tab: 'activity',
        title: 'Overtaken — weekly best',
        createdAt: '2026-07-09T12:01:00.000Z',
      }),
      item({
        id: `overtake-alltime-${roll}`,
        tab: 'activity',
        title: 'Overtaken — all-time best',
        body: 'richest',
        createdAt: '2026-07-09T12:00:00.000Z',
      }),
    ];
    const grouped = groupInboxItems(items);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.kind).toBe('crown-group');
    if (grouped[0]!.kind === 'crown-group') {
      expect(grouped[0].periods).toEqual(['today', 'week', 'alltime']);
      expect(grouped[0].body).toBe('richest');
      expect(grouped[0].title).toBe('Overtaken by @champ');
      expect(grouped[0].read).toBe(false);
    }
  });

  it('leaves single-period crowns ungrouped', () => {
    const items = [
      item({
        id: 'overtake-today-only-one',
        tab: 'activity',
      }),
    ];
    const grouped = groupInboxItems(items);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.kind).toBe('single');
  });

  it('counts unread presentations not raw rows', () => {
    const roll = 'r1';
    const payload = {
      activity: [
        item({ id: `overtake-today-${roll}`, tab: 'activity', read: false }),
        item({ id: `overtake-week-${roll}`, tab: 'activity', read: false }),
        item({ id: `overtake-alltime-${roll}`, tab: 'activity', read: false }),
        item({
          id: 'follow-1',
          tab: 'activity',
          kind: 'follow',
          read: true,
        }),
      ],
      system: [
        item({
          id: `best-today-${roll}`,
          tab: 'system',
          kind: 'system',
          read: false,
        }),
        item({
          id: `best-week-${roll}`,
          tab: 'system',
          kind: 'system',
          read: false,
        }),
      ],
    };
    const counts = countGroupedUnread(payload);
    expect(counts.activity).toBe(1);
    expect(counts.system).toBe(1);
    expect(counts.total).toBe(2);
  });
});

describe('resolveVisualType', () => {
  it('detects system crowns from id', () => {
    expect(
      resolveVisualType(
        item({ id: 'best-today-x', tab: 'system', kind: 'system' }),
      ),
    ).toBe('system_crown');
    expect(
      resolveVisualType(
        item({ id: 'admin-broadcast', tab: 'system', kind: 'system' }),
      ),
    ).toBe('system_broadcast');
  });
});

describe('parseSystemBody', () => {
  it('splits lead and detail and strips Open path', () => {
    const parsed = parseSystemBody(
      "@alice (Alice) claimed today's crown. Number 42 · RARE · 100 EP. Badges: foo. Open: /s/alice/code",
    );
    expect(parsed.openStripped).toBe(true);
    expect(parsed.lead).toContain('claimed');
    expect(parsed.detail).toContain('Number 42');
    expect(parsed.detail).not.toContain('Open:');
  });
});

describe('inboxOpenLabel', () => {
  it('labels roll shares as Open roll', () => {
    expect(inboxOpenLabel('/s/alice/abc')).toBe('Open roll');
    expect(inboxOpenLabel('/r/roll-id')).toBe('Open roll');
  });

  it('labels whats-new and other SPA paths', () => {
    expect(inboxOpenLabel('/whats-new')).toBe("Open What's new");
    expect(inboxOpenLabel('/u/alice')).toBe('Open profile');
    expect(inboxOpenLabel('/features')).toBe('Open Features');
    expect(inboxOpenLabel('/collection')).toBe('Open Codex');
  });
});
