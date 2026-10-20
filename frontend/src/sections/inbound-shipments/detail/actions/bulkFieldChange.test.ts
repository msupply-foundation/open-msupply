/*
 * A bulk edit must be able to leave a field ALONE (spec/inbound-shipments
 * ui-surface S3 → line-selection actions, OMS-REG-REPL-09.27): setting one of
 * the dialog's two fields must not disturb the other on any selected line.
 */
import { describe, expect, it } from 'vitest';
import {
  bulkFieldUpdates,
  bulkFieldValue,
  hasBulkFieldChange,
} from './bulkFieldChange';

describe('bulkFieldUpdates — only what the user touched', () => {
  // The whole point: an absent wrapper is what tells the server to leave the
  // field alone, so an untouched field must not appear in the input AT ALL.
  it('omits a field the user never touched', () => {
    expect(
      bulkFieldUpdates({ programId: { value: 'epi' }, campaignId: undefined })
    ).toEqual({ programId: { value: 'epi' } });
  });

  it('omits the other one just the same', () => {
    expect(
      bulkFieldUpdates({ programId: undefined, campaignId: { value: 'm26' } })
    ).toEqual({ campaignId: { value: 'm26' } });
  });

  it('sends nothing at all when neither was touched', () => {
    expect(
      bulkFieldUpdates({ programId: undefined, campaignId: undefined })
    ).toEqual({});
  });

  // Clearing a pick is an instruction, not the absence of one — it writes
  // "nothing in particular" to every selected line.
  it('sends an explicit clear as a null value, not as an omission', () => {
    expect(
      bulkFieldUpdates({ programId: { value: null }, campaignId: undefined })
    ).toEqual({ programId: { value: null } });
  });

  it('carries both when both were touched', () => {
    expect(
      bulkFieldUpdates({
        programId: { value: null },
        campaignId: { value: 'm26' },
      })
    ).toEqual({ programId: { value: null }, campaignId: { value: 'm26' } });
  });
});

describe('hasBulkFieldChange — whether Apply has anything to do', () => {
  it('is false while both fields are untouched', () => {
    expect(
      hasBulkFieldChange({ programId: undefined, campaignId: undefined })
    ).toBe(false);
  });

  it('is true for a pick', () => {
    expect(
      hasBulkFieldChange({ programId: { value: 'epi' }, campaignId: undefined })
    ).toBe(true);
  });

  // An explicit clear is a change, even though it looks like an empty field.
  it('is true for an explicit clear', () => {
    expect(
      hasBulkFieldChange({ programId: undefined, campaignId: { value: null } })
    ).toBe(true);
  });
});

describe('bulkFieldValue — what the picker shows as chosen', () => {
  it('shows nothing while the field is untouched', () => {
    expect(bulkFieldValue(undefined, '__none__')).toBeUndefined();
  });

  it('shows the picked id', () => {
    expect(bulkFieldValue({ value: 'epi' }, '__none__')).toBe('epi');
  });

  // Without this the explicitly-cleared field would look untouched, and the
  // two do opposite things.
  it('shows the None row once the user has chosen to clear', () => {
    expect(bulkFieldValue({ value: null }, '__none__')).toBe('__none__');
  });
});
