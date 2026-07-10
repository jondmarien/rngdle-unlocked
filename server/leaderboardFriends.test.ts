import { describe, expect, it } from 'vite-plus/test';
import {
  FRIENDS_BOARD_EMPTY_MESSAGE,
  friendCircleIds,
  friendsBoardExtras,
} from './leaderboardFriends.js';

describe('friendCircleIds', () => {
  it('always includes self when following is empty', () => {
    expect(friendCircleIds('me', [])).toEqual(['me']);
  });

  it('includes self plus following ids', () => {
    expect(friendCircleIds('me', ['a', 'b'])).toEqual(['me', 'a', 'b']);
  });

  it('dedupes self if already in following', () => {
    expect(friendCircleIds('me', ['me', 'a', 'me'])).toEqual(['me', 'a']);
  });
});

describe('friendsBoardExtras', () => {
  it('adds empty-state message when followingCount is 0', () => {
    expect(friendsBoardExtras(0)).toEqual({
      friendsOnly: true,
      followingCount: 0,
      message: FRIENDS_BOARD_EMPTY_MESSAGE,
    });
  });

  it('omits message when the user follows someone', () => {
    expect(friendsBoardExtras(3)).toEqual({
      friendsOnly: true,
      followingCount: 3,
    });
  });
});
