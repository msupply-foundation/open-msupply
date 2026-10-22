import { describe, expect, it } from 'vitest';
import {
  encounterDisplayStatus,
  encounterStatusChip,
  SETTABLE_STATUSES,
} from './encounterStatus';

// The record screen's status chip (internal #468). t() falls back to the key
// with no dictionary loaded, so a label reads as its key.

const now = new Date('2026-10-20T10:00:00Z');
const past = '2026-10-19T10:00:00Z';
const ahead = '2026-10-21T10:00:00Z';

describe('encounterDisplayStatus', () => {
  it('reads a Scheduled encounter whose start has passed as Missed', () => {
    expect(encounterDisplayStatus('PENDING', past, now)).toBe('MISSED');
  });

  it('keeps a Scheduled encounter still ahead as Scheduled', () => {
    expect(encounterDisplayStatus('PENDING', ahead, now)).toBe('PENDING');
  });

  it('never reads a Visited or Cancelled encounter as Missed', () => {
    expect(encounterDisplayStatus('VISITED', past, now)).toBe('VISITED');
    expect(encounterDisplayStatus('CANCELLED', past, now)).toBe('CANCELLED');
  });

  it('is undefined with no status, and Scheduled with no start to judge', () => {
    expect(encounterDisplayStatus(undefined, past, now)).toBeUndefined();
    expect(encounterDisplayStatus(null, past, now)).toBeUndefined();
    expect(encounterDisplayStatus('PENDING', undefined, now)).toBe('PENDING');
  });
});

describe('encounterStatusChip', () => {
  it('gives Missed the error tone and its own word', () => {
    expect(encounterStatusChip('PENDING', past, now)).toEqual({
      label: 'label.encounter-status-missed',
      colour: 'var(--status-overdue)',
    });
  });

  it('gives the stored statuses their words and tones', () => {
    expect(encounterStatusChip('PENDING', ahead, now)).toEqual({
      label: 'label.encounter-status-pending',
      colour: 'var(--status-allocated)',
    });
    expect(encounterStatusChip('VISITED', past, now)).toEqual({
      label: 'label.encounter-status-visited',
      colour: 'var(--status-finalised)',
    });
    expect(encounterStatusChip('CANCELLED', past, now)).toEqual({
      label: 'label.encounter-status-cancelled',
      colour: 'var(--status-new)',
    });
  });

  it('offers Scheduled, Visited and Cancelled, never Deleted', () => {
    expect(SETTABLE_STATUSES).toEqual(['PENDING', 'VISITED', 'CANCELLED']);
  });
});
