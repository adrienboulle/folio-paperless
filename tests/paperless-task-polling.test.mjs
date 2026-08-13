import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advancePaperlessTaskAvailability,
  DEFAULT_PAPERLESS_TASK_UNAVAILABLE_ATTEMPTS,
} from '../src/lib/paperless-task-polling.ts';

test('a transient absent Paperless task stays within the visibility grace period', () => {
  let state = { consecutiveUnavailable: 0, unavailable: false };
  for (let attempt = 1; attempt < DEFAULT_PAPERLESS_TASK_UNAVAILABLE_ATTEMPTS; attempt += 1) {
    state = advancePaperlessTaskAvailability(state.consecutiveUnavailable, false);
    assert.equal(state.unavailable, false);
  }
  state = advancePaperlessTaskAvailability(state.consecutiveUnavailable, false);
  assert.equal(state.unavailable, true);
});

test('one visible response resets consecutive task unavailability', () => {
  const absent = advancePaperlessTaskAvailability(7, false, 10);
  const visible = advancePaperlessTaskAvailability(absent.consecutiveUnavailable, true, 10);
  const absentAgain = advancePaperlessTaskAvailability(visible.consecutiveUnavailable, false, 10);
  assert.deepEqual(visible, { consecutiveUnavailable: 0, unavailable: false });
  assert.deepEqual(absentAgain, { consecutiveUnavailable: 1, unavailable: false });
});

test('task unavailability thresholds are bounded to at least one response', () => {
  assert.deepEqual(
    advancePaperlessTaskAvailability(0, false, 0),
    { consecutiveUnavailable: 1, unavailable: true },
  );
});
