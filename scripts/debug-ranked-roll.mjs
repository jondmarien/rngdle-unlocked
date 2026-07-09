import 'dotenv/config';
import { createDb } from '../server/db/index.ts';
import {
  issueRankedRoll,
  serverRollNumber,
  getUsername,
} from '../server/rankedRoll.ts';
import { user } from '../server/db/schema.ts';
import { isNotNull } from 'drizzle-orm';

const db = createDb();
console.log('serverRoll sample', serverRollNumber(), serverRollNumber());

const users = await db
  .select({ id: user.id, username: user.username })
  .from(user)
  .where(isNotNull(user.username))
  .limit(3);
console.log('users', users);

if (!users[0]) {
  console.error('no user with username');
  process.exit(1);
}

const u = users[0];
console.log('getUsername', await getUsername(db, u.id));

try {
  const roll = await issueRankedRoll(db, { userId: u.id });
  console.log('OK roll', {
    id: roll.id,
    number: roll.number,
    totalEP: roll.totalEP,
    rarity: roll.rarity,
    badges: roll.badges.length,
    source: roll.source,
  });
} catch (e) {
  console.error('FAIL', e);
  process.exit(1);
}
