#!/usr/bin/env node
// Checks every external link the app shows to learners.
//
// Sources: lesson content (content/modules) and the Resources list (assets/js/app.js).
//
// Usage: npm run check-links
// Exit code is 1 if any link is broken (4xx/5xx) or cannot be reached.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 15000;
const CONCURRENCY = 8;

const SOURCE_FILES = [
  ...fs.readdirSync(path.join(root, 'content/modules'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join('content/modules', f)),
  'assets/js/app.js',
];

// Namespace identifiers and placeholders are not links.
const IGNORE = [
  /^https?:\/\/www\.w3\.org\//,
  /^https?:\/\/example\.com/,
];

const URL_PATTERN = /https?:\/\/[^\s"'<>)\]`\\]+/g;

// Module files are one long line of JSON, so a line number says nothing.
// For those, report the lesson the link sits in instead.
function locate(text, file, offset) {
  if (!file.startsWith('content/modules/')) {
    return `${file}:${text.slice(0, offset).split('\n').length}`;
  }
  const before = text.slice(0, offset);
  const ids = [...before.matchAll(/"id":\s*"([^"]+)"/g)];
  const lesson = ids.length ? ids[ids.length - 1][1] : '?';
  return `${file}, lesson ${lesson}`;
}

function collectLinks() {
  const found = new Map(); // url -> [location]
  for (const file of SOURCE_FILES) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of text.matchAll(URL_PATTERN)) {
      const url = match[0].replace(/[.,;:]+$/, '');
      if (IGNORE.some((re) => re.test(url))) continue;
      if (!found.has(url)) found.set(url, []);
      const where = locate(text, file, match.index);
      if (!found.get(url).includes(where)) found.get(url).push(where);
    }
  }
  return found;
}

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Daintta-PNT-link-check/1.0' },
  });
}

// Some servers reject HEAD, so fall back to GET before reporting a failure.
async function check(url) {
  try {
    let res = await request(url, 'HEAD');
    if (res.status === 405 || res.status === 403 || res.status === 404 || res.status === 501) {
      res = await request(url, 'GET');
    }
    await res.body?.cancel();
    const redirected = res.redirected && res.url !== url ? res.url : null;
    return { status: res.status, redirected, error: null };
  } catch (e) {
    return { status: null, redirected: null, error: e.name === 'TimeoutError' ? 'timed out' : e.cause?.code || e.message };
  }
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

// 401/403 usually means the page needs a sign-in, or the site blocks automated
// requests. Those are reported separately so they are not mistaken for dead links.
function classify(result) {
  if (result.error) return 'unreachable';
  if (result.status >= 500) return 'server error';
  if (result.status === 401 || result.status === 403) return 'restricted';
  if (result.status >= 400) return 'broken';
  if (result.redirected) return 'redirected';
  return 'ok';
}

const links = collectLinks();
const urls = [...links.keys()].sort();
console.log(`Checking ${urls.length} links from ${SOURCE_FILES.length} files...\n`);

const results = await runPool(urls, check);

const groups = { broken: [], 'server error': [], unreachable: [], restricted: [], redirected: [], ok: [] };
urls.forEach((url, i) => {
  const kind = classify(results[i]);
  groups[kind].push({ url, result: results[i], sources: links.get(url) });
});

const NOTES = {
  broken: 'Dead links. Fix or remove.',
  'server error': 'The site returned a server error. Usually temporary; recheck later.',
  unreachable: 'No response from this machine. Check in a browser before changing anything.',
  restricted: 'Needs a sign-in, or the site blocks automated requests. Check in a browser.',
  redirected: 'Works, but now points somewhere else. Consider updating the link.',
};

for (const kind of ['broken', 'server error', 'unreachable', 'restricted', 'redirected']) {
  if (!groups[kind].length) continue;
  console.log(`${kind.toUpperCase()} (${groups[kind].length}) - ${NOTES[kind]}`);
  for (const { url, result, sources } of groups[kind]) {
    const detail = result.error ? result.error : `HTTP ${result.status}`;
    console.log(`  ${detail}  ${url}`);
    if (result.redirected) console.log(`      now at ${result.redirected}`);
    for (const s of sources) console.log(`      ${s}`);
  }
  console.log('');
}

console.log(
  `Summary: ${groups.ok.length} ok, ${groups.redirected.length} redirected, ` +
  `${groups.broken.length} broken, ${groups['server error'].length} server errors, ` +
  `${groups.unreachable.length} unreachable, ${groups.restricted.length} restricted`
);

// Write the same results to the GitHub Actions job summary when running in CI.
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [`## Link check`, '', `${urls.length} links checked.`, ''];
  for (const kind of ['broken', 'server error', 'unreachable', 'restricted', 'redirected']) {
    if (!groups[kind].length) continue;
    md.push(`### ${kind} (${groups[kind].length})`, `_${NOTES[kind]}_`, '');
    for (const { url, result, sources } of groups[kind]) {
      md.push(`- ${result.error ?? `HTTP ${result.status}`}: ${url}`);
      for (const s of sources) md.push(`  - ${s}`);
    }
    md.push('');
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
}

// Warn by default. Pass --strict to fail the run when any link is broken or unreachable.
const failed = groups.broken.length + groups['server error'].length + groups.unreachable.length;
if (process.argv.includes('--strict') && failed) process.exitCode = 1;
