/**
 * Assemble the deployable static site in public/.
 *
 *     node tools/build_web.mjs
 *
 * This is what Vercel runs (see ../vercel.json). It has no dependencies — the
 * demo stays framework-free; the only thing this build does is copy the site
 * into an output directory and drop the AI assistant, which needs a server-side
 * OpenAI key that the deployed copy does not have. Local development is
 * unaffected: tools/serve.py still serves index.html with the AI drawer.
 *
 * Output: public/  (git-ignored; regenerated on every deploy)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'public');

/** Everything the browser needs. docs/, tools/ and dist/ are not web pages. */
const COPY = ['assets', 'src'];
/** Sources that only exist for the local, server-backed variant. */
const SKIP = new Set([path.join('src', 'ai.js')]);

function copyTree(rel) {
  const from = path.join(ROOT, rel);
  const to = path.join(OUT, rel);
  let files = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const childRel = path.join(rel, entry.name);
    if (SKIP.has(childRel)) continue;
    if (entry.isDirectory()) {
      files += copyTree(childRel);
    } else {
      fs.mkdirSync(to, { recursive: true });
      fs.copyFileSync(path.join(from, entry.name), path.join(to, entry.name));
      files += 1;
    }
  }
  return files;
}

/** Drop every <!-- ai:start -->…<!-- ai:end --> region from the shell. */
function stripAi(html) {
  const stripped = html.replace(/<!--\s*ai:start\s*-->[\s\S]*?<!--\s*ai:end\s*-->\n?/g, '');
  if (stripped === html) throw new Error('no ai:start/ai:end region found in index.html');
  return stripped;
}

/** Every local src=/href= in the shell must resolve inside the output. */
function verifyReferences(html) {
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|data:|mailto:|#)/.test(ref)) continue;
    refs.add(ref);
  }
  const missing = [...refs].filter((ref) => !fs.existsSync(path.join(OUT, ref)));
  if (missing.length) throw new Error('unresolved reference in output: ' + missing.join(', '));
  return refs.size;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let files = 0;
for (const rel of COPY) files += copyTree(rel);

let html = stripAi(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
if (/\bai:(start|end)\b/.test(html) || html.includes('src/ai.js')) {
  throw new Error('build failed: AI markup survived the strip');
}
fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
files += 1;

// The demo carries real worker records; it is shared by link, not by search.
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
files += 1;

const refs = verifyReferences(html);
const bytes = (function size(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const full = path.join(dir, entry.name);
    return total + (entry.isDirectory() ? size(full) : fs.statSync(full).size);
  }, 0);
})(OUT);

console.log('wrote %s', path.relative(ROOT, OUT));
console.log('  files: %d', files);
console.log('  references resolved: %d', refs);
console.log('  size: %s KB', (bytes / 1024).toFixed(1));
console.log('  AI assistant: excluded (no server key in the deployed copy)');
