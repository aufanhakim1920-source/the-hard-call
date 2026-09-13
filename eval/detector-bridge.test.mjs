import test from 'node:test';
import assert from 'node:assert/strict';
import loadTS from './helpers/load-ts.cjs';

function bridge(detect) {
  return loadTS('src/lib/detectorBridge.ts', {
    '../detector/detect': { detect }, './api': { todayISO: () => '2026-09-13' },
    './types': { uid: () => 'sign1' },
  });
}
test('local detector never receives inferred customer or staff turns', async () => {
  let received;
  const { localSigns } = bridge(async (t) => { received = t; return []; });
  await localSigns([
    { id: 'a', t: 100, speaker: 'customer', text: 'known' },
    { id: 'b', t: 200, speaker: 'customer', speakerConfidence: 'inferred', text: 'guess' },
    { id: 'c', t: 300, speaker: 'worker', speakerConfidence: 'inferred', text: 'guess' },
    { id: 'd', t: 400, speaker: 'unknown', text: 'unknown' },
  ], 'd', []);
  assert.deepEqual(Array.from(received.turns, x => x.text), ['known']);
});
test('a delayed local flag links to its originating turn, not the current turn', async () => {
  const { localSigns } = bridge(async () => [{ rule_id: 'NCC_72_ORAL_NOTICE',
    raised_at: { speaker: 'customer', start_ms: 100 }, deadline_days: 21,
    obligation: 'Notify', staff_prompt: 'Can we help?', confidence: 1, authority: 'rule' }]);
  const result = await localSigns([
    { id: 'a', t: 100, speaker: 'worker', text: 'Hello' },
    { id: 'b', t: 200, speaker: 'customer', text: 'Cannot pay' },
    { id: 'c', t: 300, speaker: 'worker', text: 'Okay' },
  ], 'c', []);
  assert.equal(result[0].lineId, 'b');
  assert.equal(result[0].evidence, 'Cannot pay');
});
