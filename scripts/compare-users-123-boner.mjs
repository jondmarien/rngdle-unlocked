import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

const users = await sql`
  SELECT id, email, username, name, role, created_at, updated_at
  FROM "user"
  WHERE lower(username) IN ('123', 'boner')
  ORDER BY username
`;
console.log('=== users ===');
console.log(JSON.stringify(users, null, 2));

if (users.length === 0) {
  process.exit(0);
}

const ids = users.map((u) => u.id);

const progress = await sql`
  SELECT
    user_id,
    lifetime_ep,
    lifetime_roll_count,
    journey_ep,
    length(collection_json) AS collection_len,
    left(collection_json, 200) AS collection_head,
    left(stats_json, 400) AS stats_head,
    updated_at
  FROM user_progress
  WHERE user_id = ANY(${ids})
`;
console.log('\n=== progress ===');
console.log(JSON.stringify(progress, null, 2));

const rollStats = await sql`
  SELECT
    user_id,
    count(*)::int AS roll_count,
    count(*) FILTER (WHERE source = 'ranked')::int AS ranked,
    count(*) FILTER (WHERE source = 'client')::int AS client,
    count(*) FILTER (WHERE source = 'challenge')::int AS challenge,
    max(total_ep)::int AS max_ep,
    max(number)::int AS max_number,
    min(rolled_at) AS first_roll,
    max(rolled_at) AS last_roll
  FROM rolls
  WHERE user_id = ANY(${ids})
  GROUP BY user_id
`;
console.log('\n=== roll stats ===');
console.log(JSON.stringify(rollStats, null, 2));

const best = await sql`
  SELECT user_id, id, number, total_ep, rarity, source, short_code, rolled_at, left(badges_json, 120) AS badges_head
  FROM rolls
  WHERE user_id = ANY(${ids})
  ORDER BY total_ep DESC, rolled_at DESC
  LIMIT 20
`;
console.log('\n=== top rolls by EP ===');
console.log(JSON.stringify(best, null, 2));

const sharedIds = await sql`
  SELECT a.id, a.user_id AS user_a, b.user_id AS user_b, a.number, a.total_ep, a.source
  FROM rolls a
  JOIN rolls b ON a.id = b.id AND a.user_id < b.user_id
  WHERE a.user_id = ANY(${ids}) AND b.user_id = ANY(${ids})
`;
console.log('\n=== identical roll IDs across both users ===');
console.log(JSON.stringify(sharedIds, null, 2));

const sameNumberEp = await sql`
  SELECT a.number, a.total_ep, a.source,
         a.id AS id_a, a.user_id AS user_a, a.rolled_at AS rolled_a,
         b.id AS id_b, b.user_id AS user_b, b.rolled_at AS rolled_b
  FROM rolls a
  JOIN rolls b
    ON a.number = b.number
   AND a.total_ep = b.total_ep
   AND a.user_id < b.user_id
  WHERE a.user_id = ANY(${ids}) AND b.user_id = ANY(${ids})
  ORDER BY a.total_ep DESC
  LIMIT 30
`;
console.log('\n=== same number+EP pairs (different roll rows) ===');
console.log(JSON.stringify(sameNumberEp, null, 2));

const accounts = await sql`
  SELECT user_id, provider_id, account_id, created_at
  FROM account
  WHERE user_id = ANY(${ids})
`;
console.log('\n=== auth accounts ===');
console.log(JSON.stringify(accounts, null, 2));

// Compare collection badge sets if present
for (const p of progress) {
  try {
    const col = JSON.parse(await (async () => {
      const full = await sql`
        SELECT collection_json, stats_json FROM user_progress WHERE user_id = ${p.user_id}
      `;
      return full[0].collection_json;
    })());
    const idsSet = Array.isArray(col)
      ? col.map((c) => c.badgeId ?? c.id).filter(Boolean).sort()
      : [];
    console.log(`\n=== collection badge ids for ${p.user_id.slice(0, 8)} (${idsSet.length}) ===`);
    console.log(idsSet.slice(0, 40).join(', '), idsSet.length > 40 ? `... +${idsSet.length - 40}` : '');
  } catch (e) {
    console.log('collection parse fail', e.message);
  }
}

const fullCols = await sql`
  SELECT user_id, collection_json FROM user_progress WHERE user_id = ANY(${ids})
`;
if (fullCols.length === 2) {
  const a = JSON.parse(fullCols[0].collection_json);
  const b = JSON.parse(fullCols[1].collection_json);
  const setA = new Set((Array.isArray(a) ? a : []).map((c) => c.badgeId ?? c.id));
  const setB = new Set((Array.isArray(b) ? b : []).map((c) => c.badgeId ?? c.id));
  const onlyA = [...setA].filter((x) => !setB.has(x));
  const onlyB = [...setB].filter((x) => !setA.has(x));
  const both = [...setA].filter((x) => setB.has(x));
  console.log('\n=== collection overlap ===');
  console.log({
    userA: fullCols[0].user_id.slice(0, 8),
    userB: fullCols[1].user_id.slice(0, 8),
    sizeA: setA.size,
    sizeB: setB.size,
    shared: both.length,
    onlyA: onlyA.length,
    onlyB: onlyB.length,
    onlyASample: onlyA.slice(0, 15),
    onlyBSample: onlyB.slice(0, 15),
    identicalJson: fullCols[0].collection_json === fullCols[1].collection_json,
  });

  const statsA = await sql`SELECT stats_json FROM user_progress WHERE user_id = ${fullCols[0].user_id}`;
  const statsB = await sql`SELECT stats_json FROM user_progress WHERE user_id = ${fullCols[1].user_id}`;
  console.log('\n=== stats_json identical? ===', statsA[0].stats_json === statsB[0].stats_json);
  console.log('stats A:', statsA[0].stats_json.slice(0, 500));
  console.log('stats B:', statsB[0].stats_json.slice(0, 500));
}
