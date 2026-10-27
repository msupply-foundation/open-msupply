import { describe, expect, it } from 'vitest';
import { statusEventTexts } from '../program/programEvents';
import {
  encounterAdditionalInfo,
  encounterStatusLabel,
  encounterTiming,
  enrolmentNameByContext,
} from './encounterColumns';

// Anchors: spec/encounters/cases/OMS-REG-DIS-11 (Additional info) and
// spec/patients/cases/OMS-REG-DIS-02.61. t() falls back to the key with no
// dictionary loaded, so the timing chip reads as its two keys.

// Local-day instants (the timing is judged by the device's calendar day), so
// the tests read the same in every zone: noon today, noon the days either
// side.
const now = new Date(2026, 9, 20, 12, 0);
const past = new Date(2026, 9, 19, 12, 0).toISOString();
const ahead = new Date(2026, 9, 21, 12, 0).toISOString();
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
  it('is missed for a Scheduled encounter whose day has passed (OMS-REG-DIS-11.15)', () => {
    expect(encounterTiming('PENDING', past, now)).toBe('missed');
  });

  it('is neither for a Scheduled encounter due today, whatever the hour', () => {
    const earlierToday = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const laterToday = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    expect(
      encounterTiming('PENDING', earlierToday.toISOString(), now)
    ).toBeUndefined();
    expect(
      encounterTiming('PENDING', laterToday.toISOString(), now)
    ).toBeUndefined();
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

describe('encounterStatusLabel', () => {
  it('names a pending encounter Scheduled, through the pending key (spec/encounters/rules.md § encounter status)', () => {
    expect(encounterStatusLabel('PENDING')).toBe(
      'label.encounter-status-pending'
    );
  });

  it('is blank for a null status (spec/encounters/contract.md § encounter status)', () => {
    expect(encounterStatusLabel(null)).toBe('');
  });
});

describe('enrolmentNameByContext', () => {
  // The Program column: the enrolment registry's name, matched by context id
  // (OMS-REG-DIS-11.3; spec/encounters/contract.md § what an encounter is).
  it('names a context by its enrolment registry (OMS-REG-DIS-11.3)', () => {
    const name = enrolmentNameByContext([
      { contextId: 'hiv', name: 'HIV Care' },
      { contextId: 'fp', name: 'Family Planning' },
    ]);
    expect(name('hiv')).toBe('HIV Care');
    expect(name('fp')).toBe('Family Planning');
  });

  it('takes the first named registry of a context', () => {
    expect(
      enrolmentNameByContext([
        { contextId: 'hiv', name: 'HIV Care' },
        { contextId: 'hiv', name: 'HIV Care (old)' },
      ])('hiv')
    ).toBe('HIV Care');
  });

  it('skips a registry with no name', () => {
    expect(
      enrolmentNameByContext([
        { contextId: 'hiv', name: null },
        { contextId: 'hiv', name: 'HIV Care' },
      ])('hiv')
    ).toBe('HIV Care');
  });

  it('is blank for a context with no readable registry', () => {
    expect(
      enrolmentNameByContext([{ contextId: 'hiv', name: 'HIV Care' }])('hidden')
    ).toBe('');
  });
});
