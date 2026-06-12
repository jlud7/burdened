/**
 * Generates game art via GPT Image on Replicate and drops PNGs into public/art/.
 * The game automatically uses any PNG that exists there, falling back to the
 * built-in SVG placeholders otherwise. Safe to re-run: existing files are skipped.
 *
 * Setup: put REPLICATE_API_TOKEN=r8_... in a `.env` file at the repo root.
 * Usage: npm run art            (generate everything missing)
 *        npm run art -- hero enemy_slime   (generate specific ids)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/art');
mkdirSync(outDir, { recursive: true });

// minimal .env loader (no deps)
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env yet */ }

const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) {
  console.error('No REPLICATE_API_TOKEN found.\nCreate a file named `.env` in the repo root containing:\n\n  REPLICATE_API_TOKEN=r8_your_token_here\n');
  process.exit(1);
}

// GPT Image 2.0 on Replicate. Override with REPLICATE_MODEL if the slug differs
// (check https://replicate.com/openai for the exact name on your account).
const MODEL = process.env.REPLICATE_MODEL ?? 'openai/gpt-image-2';

const STYLE =
  'Clean minimalist 2D vector game art, chibi proportions, character has blank white oval eyes and no other facial features, ' +
  'bold dark-brown outlines, flat side-on perspective, muted earthy palette of parchment beige, umber brown, sage green, slate blue and brick red, ' +
  'subtle grainy distressed texture overlay, plain solid very light parchment background, single centered subject, no text. ';

const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/art-manifest.json'), 'utf8'));

const only = process.argv.slice(2);

async function generate(id, prompt) {
  const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({ input: { prompt: STYLE + prompt, aspect_ratio: '1:1', ...(process.env.REPLICATE_EXTRA_INPUT ? JSON.parse(process.env.REPLICATE_EXTRA_INPUT) : {}) } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  let pred = await res.json();

  // poll if the prediction didn't finish within the wait window
  while (pred.status === 'starting' || pred.status === 'processing') {
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    pred = await poll.json();
  }
  if (pred.status !== 'succeeded') throw new Error(`prediction ${pred.status}: ${pred.error ?? ''}`);

  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  const img = await fetch(url);
  writeFileSync(resolve(outDir, `${id}.png`), Buffer.from(await img.arrayBuffer()));
}

let made = 0;
for (const entry of manifest) {
  const { id, prompt, alias } = entry;
  if (only.length && !only.includes(id)) continue;
  const out = resolve(outDir, `${id}.png`);
  if (existsSync(out)) continue;
  if (alias) {
    const src = resolve(outDir, `${alias}.png`);
    if (existsSync(src)) {
      copyFileSync(src, out);
      console.log(`↳ ${id} (copy of ${alias})`);
      made++;
    }
    continue;
  }
  process.stdout.write(`⚙ ${id} ... `);
  try {
    await generate(id, prompt);
    console.log('done');
    made++;
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
  }
}
console.log(made ? `\n${made} file(s) written to public/art/. Reload the game to see them.` : '\nNothing to do (all art exists, or no ids matched).');
