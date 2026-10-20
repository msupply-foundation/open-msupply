import { describe, expect, it } from 'vitest';
import { statusEventTexts } from '../program/programEvents';
import { encounterAdditionalInfo, encounterTiming } from './encounterColumns';

// Anchors: spec/encounters/cases/OMS-REG-DIS-11 (Additional info) and
// spec/patients/cases/OMS-REG-DIS-02.61. t() falls back to the key with no
// dictionary loaded, so the timing chip reads as its two keys.

const now = new Date('2026-10-20T10:00:00Z');
const past = '2026-10-19T10:00:00Z';
const ahead = '2026-10-21T10:00:00Z';
const MISSED = 'label.encounter label.encounter-status-missed';
const SCHEDULED = 'label.encounter label.encounter-status-scheduled';

const event = (type: string, data: string | null) => ({ type, data });

describe('statusEventTexts', () => {
  it('shows an event whose type begins status, as its text (OMS-REG-DIS-11.10)', () => {
    expect(statusEventTexts([event('status_vl', 'VL Results')])).toEqual([
      'VL Results',
    ]);
  });

  it('shows no other event type (OMS-REG-DIS-11.11)', () => {
    expect(statusEventTexts([event('regimen', 'First line')])).toEqual([]);
  });

  it('keeps the order the server returns, newest first (OMS-REG-DIS-02.61)', () => {
    expect(
      statusEventTexts([
        event('status', 'LTFU'),
        event('status_appt', 'Missed appointment'),
      ])
    ).toEqual(['LTFU', 'Missed appointment']);
  });

  it('shows nothing for a status event without text', () => {
    expect(statusEventTexts([event('status', null)])).toEqual([]);
  });
});

describe('encounterTiming', () => {
  it('is missed for a Scheduled encounter whose start has passed (OMS-REG-DIS-11.15)', () => {
    expect(encounterTiming('PENDING', past, now)).toBe('missed');
  });

  it('is scheduled for a Scheduled encounter whose start is ahead (OMS-REG-DIS-11.16)', () => {
    expect(encounterTiming('PENDING', ahead, now)).toBe('scheduled');
  });

  it('is none for a Visited or Cancelled encounter (OMS-REG-DIS-11.17)', () => {
    expect(encounterTiming('VISITED', past, now)).toBeUndefined();
    expect(encounterTiming('CANCELLED', ahead, now)).toBeUndefined();
  });
});

describe('encounterAdditionalInfo', () => {
  const row = (
    status: 'PENDING' | 'VISITED',
    startDatetime: string,
    events: { type: string; data: string | null }[]
  ) => ({ status, startDatetime, activeProgramEvents: { nodes: events } });

  it('puts the timing chip after the status-event chips (OMS-REG-DIS-11.34)', () => {
    expect(
      encounterAdditionalInfo(
        row('PENDING', past, [event('status', 'Pending VL Results')]),
        now
      )
    ).toEqual(['Pending VL Results', MISSED]);
  });

  it('shows only the timing chip when there are no status events', () => {
    expect(encounterAdditionalInfo(row('PENDING', ahead, []), now)).toEqual([
      SCHEDULED,
    ]);
  });

  it('is empty with no status events and no timing chip (OMS-REG-DIS-11.18)', () => {
    expect(
      encounterAdditionalInfo(row('VISITED', past, [event('other', 'x')]), now)
    ).toEqual([]);
  });
});
