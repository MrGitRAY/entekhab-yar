import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStartInput } from '../src/domain/assessment/input.ts';

test('accepts Persian and Arabic digits and normalizes the exam year', () => {
  assert.deepEqual(parseStartInput({ displayName: '  مهسا  ', examYear: '۱۴۰۵', examGroup: 'experimental' }),
    { displayName: 'مهسا', examYear: 1405, examGroup: 'experimental' });
  assert.equal(parseStartInput({ displayName: 'علی', examYear: '١٤٠٦', examGroup: 'mathematics' }).examYear, 1406);
});

test('rejects invalid group, year and blank name', () => {
  assert.throws(() => parseStartInput({ displayName: 'آوا', examYear: '۱۴۰۵', examGroup: 'humanities' }), /گروه/);
  assert.throws(() => parseStartInput({ displayName: 'آوا', examYear: '۱۴۰', examGroup: 'experimental' }), /چهار رقم/);
  assert.throws(() => parseStartInput({ displayName: '  ', examYear: '۱۴۰۵', examGroup: 'experimental' }), /نام/);
});
