/**
 * Strips backgrounds from the generated art via 851-labs/background-remover on
 * Replicate, writing transparent PNGs back in place. Scenes keep their
 * backgrounds (destinations, run summaries) — only single-subject sprites are
 * processed. Originals live in git history if a result ever needs reverting.
 *
 * Usage: npm run art:bg                  (all sprite-type images)
 *        npm run art:bg -- hero mule     (specific ids)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artDir = resolve(root, 'public/art');

// scenes whose backgrounds ARE the picture
const KEEP_BACKGROUND = new Set(['dest_woods', 'dest_dungeon', 'summary_home', 'summary_lost']);

// minimal .env loader (no deps)
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env yet */ }

const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) {
  console.error('No REPLICATE_API_TOKEN found in .env');
  process.exit(1);
}

const MODEL = process.env.REPLICATE_BG_MODEL ?? '851-labs/background-remover';

// community model → resolve the latest version id, then create by version
const modelRes = await fetch(`https://api.replicate.com/v1/models/${MODEL}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
  signal: AbortSignal.timeout(30_000),
});
if (!modelRes.ok) throw new Error(`model lookup: ${modelRes.status} ${await modelRes.text()}`);
const VERSION = (await modelRes.json()).latest_version?.id;
if (!VERSION) throw new Error(`no latest version for ${MODEL}`);

async function removeBackground(id) {
  const png = readFileSync(resolve(artDir, `${id}.png`));
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    signal: AbortSignal.timeout(120_000),
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      version: VERSION,
      input: {
        image: `data:image/png;base64,${png.toString('base64')}`,
        threshold: 0, // soft alpha edges
        background_type: 'rgba',
        format: 'png',
      },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  let pred = await res.json();
  while (pred.status === 'starting' || pred.status === 'processing') {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(30_000),
    });
    pred = await poll.json();
  }
  if (pred.status !== 'succeeded') throw new Error(`prediction ${pred.status}: ${pred.error ?? ''}`);
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  const img = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  writeFileSync(resolve(artDir, `${id}.png`), Buffer.from(await img.arrayBuffer()));
}

const only = process.argv.slice(2);
const all = readdirSync(artDir)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.replace(/\.png$/, ''))
  .filter((id) => (only.length ? only.includes(id) : !KEEP_BACKGROUND.has(id)));

let done = 0;
let failed = 0;
const queue = [...all];
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    try {
      await removeBackground(id);
      console.log(`✂ ${id}`);
      done++;
    } catch (e) {
      console.log(`✂ ${id} FAILED — ${e.message}`);
      failed++;
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`\n${done} stripped, ${failed} failed${failed ? ' (re-run to retry; originals are in git)' : ''}.`);
process.exit(failed ? 1 : 0);
