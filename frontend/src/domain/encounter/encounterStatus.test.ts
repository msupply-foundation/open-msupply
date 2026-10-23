import { describe, expect, it } from 'vitest';
import {
  encounterDisplayStatus,
  encounterStatusChip,
  SETTABLE_STATUSES,
} from './encounterStatus';

// The record screen's status chip. t() falls back to the key
// with no dictionary loaded, so a label reads as its key.

// Local-day instants, as Missed is judged by the device's calendar day.
const now = new Date(2026, 9, 20, 12, 0);
const past = new Date(2026, 9, 19, 12, 0).toISOString();
const ahead = new Date(2026, 9, 21, 12, 0).toISOString();

describe('encounterDisplayStatus', () => {
  it('reads a Scheduled encounter whose day has passed as Missed', () => {
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
