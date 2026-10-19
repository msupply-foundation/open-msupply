/*
 * The Activity list's tiering (spec/campaigns rules › where campaigns are
 * used): an installation may configure SEVERAL routine entries as well as
 * several campaigns, so Routine is a tier like Campaign — ordered, scopable,
 * and headed only while both tiers are on screen.
 */
import { describe, expect, it } from 'vitest';
import {
  activityOptions,
  spansBothTiers,
  type KindFilter,
} from './activityOptions';

const routine = (id: string, name: string) =>
  ({ id, name, kind: 'ROUTINE' }) as const;
const campaign = (id: string, name: string) =>
  ({ id, name, kind: 'CAMPAIGN' }) as const;

// A register with more than one of EACH tier — the case that makes Routine a
// tier rather than a single pinned row.
const register = [
  campaign('measles', 'Measles 2026'),
  routine('epi', 'EPI routine'),
  campaign('polio', 'Polio round 2'),
  routine('outreach', 'Routine outreach'),
];

const ids = (filter: KindFilter, selectedId?: string) =>
  activityOptions(register, filter, selectedId).map(o => o.node.id);

describe('activityOptions — tier order', () => {
  it('puts every routine entry first, campaigns after', () => {
    expect(ids('all')).toEqual(['epi', 'outreach', 'measles', 'polio']);
  });

  it('keeps the register`s own order within each tier', () => {
    // Not alphabetical, not re-sorted: the register is already name-sorted and
    // this must not second-guess it.
    expect(ids('all').slice(0, 2)).toEqual(['epi', 'outreach']);
    expect(ids('all').slice(2)).toEqual(['measles', 'polio']);
  });
});

describe('activityOptions — the kind filter', () => {
  it('scopes to the routine tier', () => {
    expect(ids('ROUTINE')).toEqual(['epi', 'outreach']);
  });

  it('scopes to the campaign tier', () => {
    expect(ids('CAMPAIGN')).toEqual(['measles', 'polio']);
  });

  // A value the field displays must be in the list that claims to offer the
  // options — otherwise it could not be picked back, and the Combobox would
  // pin it above the very strip that excluded it.
  it('exempts the current selection from a tier it does not belong to', () => {
    expect(ids('ROUTINE', 'measles')).toEqual(['epi', 'outreach', 'measles']);
  });

  it('exempts nothing when the selection already belongs to the tier', () => {
    expect(ids('ROUTINE', 'epi')).toEqual(['epi', 'outreach']);
  });

  it('exempts nothing when the field is empty', () => {
    expect(ids('ROUTINE', undefined)).toEqual(['epi', 'outreach']);
  });

  it('ignores a selection the register does not hold (a deleted campaign)', () => {
    expect(ids('ROUTINE', 'deleted')).toEqual(['epi', 'outreach']);
  });
});

describe('spansBothTiers — whether the filter and the headings earn their place', () => {
  it('is true for a register holding both', () => {
    expect(spansBothTiers(register)).toBe(true);
  });

  it('is false for campaigns alone', () => {
    expect(spansBothTiers([campaign('measles', 'Measles 2026')])).toBe(false);
  });

  it('is false for routine entries alone', () => {
    expect(
      spansBothTiers([routine('epi', 'EPI'), routine('o', 'Outreach')])
    ).toBe(false);
  });

  it('is false for an empty register', () => {
    expect(spansBothTiers([])).toBe(false);
  });

  // The headings ask it of what is ON SCREEN, so a pinned deleted campaign
  // beside the routine tier brings its heading back with it.
  it('counts a pinned selection alongside the options', () => {
    const scoped = activityOptions(register, 'ROUTINE');
    expect(spansBothTiers(scoped)).toBe(false);
    expect(spansBothTiers([...scoped, { kind: 'CAMPAIGN' }])).toBe(true);
  });
});
