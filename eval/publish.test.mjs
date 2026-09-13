import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { publishResults } from './publish.mjs';

for (const [name, overrides, writes] of [
  ['full oracle-style preview', { publish: false }, false],
  ['partial run', { total: 44 }, false],
  ['blind experiment', { blind: true }, false],
  ['failed API call', { results: { n: 2, errors: 1, cases: [{ ok: true }, { ok: false }] } }, false],
  ['empty corpus', { total: 0 }, false],
  ['explicit complete run', {}, true],
]) test(`publication: ${name}`, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'callflag-publish-'));
  try {
    const paths = ['internal.json', 'public.json'].map(x => path.join(dir, x));
    paths.forEach(x => fs.writeFileSync(x, 'historical score'));
    publishResults({ publish: true, blind: false, total: 2,
      results: { n: 2, errors: 0, cases: [{ ok: true }, { ok: true }] }, paths, ...overrides });
    for (const file of paths) {
      if (writes) assert.equal(JSON.parse(fs.readFileSync(file)).n, 2);
      else assert.equal(fs.readFileSync(file, 'utf8'), 'historical score');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
