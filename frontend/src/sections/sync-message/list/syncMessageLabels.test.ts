import { describe, expect, it } from 'vitest';
import {
  authorableTypeLabel,
  fileStatusLabelKey,
  statusLabelKey,
  typeLabelKey,
} from './syncMessageLabels';

// Anchors: spec/sync-message/cases/OMS-REG-MNG-04.
//   .4  — Status and Type render as RESOLVED names, never raw values
//   .22 — each attached file shows its own transfer state
// (ui-surface.md S1 § columns, S3 § files.)
//
// Assertions are on the locale KEY each value resolves to: the key is what the
// screen owns, the string behind it is the catalog's (and t() falls back to the
// key with no dictionary loaded, as here).

describe('OMS-REG-MNG-04.4 — statuses render as names', () => {
  it('names all four of the message lifecycle', () => {
    expect(statusLabelKey('new')).toBe('label.new');
    expect(statusLabelKey('inProgress')).toBe('status.in-progress');
    expect(statusLabelKey('processed')).toBe('label.processed');
    expect(statusLabelKey('error')).toBe('status.error');
  });

  it('never leaks a raw wire value for a status the enum does not name', () => {
    expect(statusLabelKey('somethingNew')).toBe('messages.not-applicable');
  });
});

describe('OMS-REG-MNG-04.4 — kinds render as names', () => {
  it('names all three kinds the record carries', () => {
    expect(typeLabelKey('supportUpload')).toBe('label.support-upload');
    expect(typeLabelKey('requestFieldChange')).toBe(
      'label.request-field-change'
    );
    expect(typeLabelKey('other')).toBe('label.other');
  });

  it('never leaks a raw wire value for a kind the enum does not name', () => {
    expect(typeLabelKey('merge')).toBe('messages.not-applicable');
  });

  it('labels the ONE authorable kind from the same map, so the create modal and the register cannot disagree', () => {
    expect(authorableTypeLabel('SUPPORT_UPLOAD')).toBe(
      typeLabelKey('supportUpload')
    );
  });
});

describe('OMS-REG-MNG-04.22 — a file shows its own transfer state', () => {
  it('names all five transfer states — a SECOND vocabulary, distinct from the message status', () => {
    expect(fileStatusLabelKey('NEW')).toBe('label.new');
    expect(fileStatusLabelKey('IN_PROGRESS')).toBe('label.in-progress');
    expect(fileStatusLabelKey('DONE')).toBe('label.done');
    expect(fileStatusLabelKey('ERROR')).toBe('label.error');
    expect(fileStatusLabelKey('PERMANENT_FAILURE')).toBe(
      'label.permanent-failure'
    );
  });

  it('never leaks a raw transfer state the enum does not name', () => {
    expect(fileStatusLabelKey('QUEUED')).toBe('messages.not-applicable');
  });
});
