import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
test('HTML assets, hash navigation and IDs resolve under a repository subpath', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const target = match[1];
    if (target.startsWith('https:')) continue;
    if (target.startsWith('#')) {
      const hash = target.slice(1);
      assert.ok(ids.includes(hash) || ids.includes(`page-${hash}`), target);
    } else {
      assert.ok(target.startsWith('./'), target);
      await access(new URL(target, root));
      const resolved = new URL(target, 'https://example.github.io/ai-puzzle-lab/');
      assert.ok(resolved.pathname.startsWith('/ai-puzzle-lab/'));
    }
  }
});
test('all ES module imports exist and application IDs match real elements', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  for (const file of await readdir(new URL('js/', root))) {
    const url = new URL(`js/${file}`, root), code = await readFile(url, 'utf8');
    for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) await access(new URL(match[1], url));
    for (const match of code.matchAll(/\$\('([^']+)'\)/g)) assert.ok(html.includes(`id="${match[1]}"`), `${file}: ${match[1]}`);
    assert.doesNotMatch(code, /localhost:\d+|127\.0\.0\.1|[A-Z]:\\/);
  }
  assert.match(html, /type="module"/);
  assert.doesNotMatch(html, /registration\s*(number|no\.?|id)|\breg\s*no\b/i);
});
