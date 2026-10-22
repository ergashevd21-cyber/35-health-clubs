import test from 'node:test';
import assert from 'node:assert/strict';
import { isHrAdmin, parseHrAction } from '../lib/hr-admin.mjs';

test('HR allowlist accepts only explicitly listed Telegram user IDs', () => {
  assert.equal(isHrAdmin(12345, '111, 12345, 999'), true);
  assert.equal(isHrAdmin(12346, '111, 12345, 999'), false);
  assert.equal(isHrAdmin('12345', ''), false);
  assert.equal(isHrAdmin('12abc', '12abc'), false);
});

test('HR callback parser accepts list and supported interview actions', () => {
  assert.deepEqual(parseHrAction('hr:list'), { action: 'list' });
  assert.deepEqual(parseHrAction('hr:confirm:123e4567-e89b-12d3-a456-426614174000'), {
    action: 'confirm', interviewId: '123e4567-e89b-12d3-a456-426614174000'
  });
  assert.equal(parseHrAction('hr:attended:123e4567-e89b-12d3-a456-426614174000').action, 'attended');
  assert.equal(parseHrAction('hr:delete:123e4567-e89b-12d3-a456-426614174000'), null);
  assert.equal(parseHrAction('hr:confirm:not-a-uuid'), null);
});
