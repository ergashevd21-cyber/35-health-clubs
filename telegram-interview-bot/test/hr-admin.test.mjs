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

import { parseCandidateAction } from '../lib/hr-admin.mjs';

test('candidate callback parser accepts only supported candidate actions', () => {
  assert.deepEqual(parseCandidateAction('candidate:confirm:123e4567-e89b-12d3-a456-426614174000'), {
    action: 'confirm', interviewId: '123e4567-e89b-12d3-a456-426614174000'
  });
  assert.equal(parseCandidateAction('candidate:reschedule:123e4567-e89b-12d3-a456-426614174000').action, 'reschedule');
  assert.equal(parseCandidateAction('candidate:cancel:123e4567-e89b-12d3-a456-426614174000').action, 'cancel');
  assert.equal(parseCandidateAction('candidate:delete:123e4567-e89b-12d3-a456-426614174000'), null);
  assert.equal(parseCandidateAction('candidate:confirm:not-a-uuid'), null);
});


test('candidate callback parser accepts one-hour arrival confirmation actions', () => {
  assert.deepEqual(parseCandidateAction('candidate:confirm_arrival:123e4567-e89b-12d3-a456-426614174000'), {
    action: 'confirm_arrival', interviewId: '123e4567-e89b-12d3-a456-426614174000'
  });
  assert.deepEqual(parseCandidateAction('candidate:cannot_attend:123e4567-e89b-12d3-a456-426614174000'), {
    action: 'cannot_attend', interviewId: '123e4567-e89b-12d3-a456-426614174000'
  });
});
