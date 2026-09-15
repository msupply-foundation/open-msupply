import { describe, expect, it } from 'vitest';
import { clinicianForUsername } from './clinicianResource';
import type { Clinician } from './clinicianResource';

// The username → clinician convention behind the prescribing surfaces' default
// pick (spec/prescription-requests AC-C6): a clinician's CODE is matched
// against the signed-in username. Nothing links the two records, so the match
// is lenient and a miss is an ordinary "no default".

const clinician = (id: string, code: string): Clinician => ({
  id,
  code,
  firstName: null,
  lastName: id,
  initials: id.slice(0, 2),
});

const list = [
  clinician('ana', 'ANA'),
  clinician('bo', ' bo '),
  clinician('cass', 'cass'),
];

// AC-C6 — the current user is probably the prescriber.
describe('clinicianForUsername', () => {
  it('matches a code to the username, ignoring case and surrounding space', () => {
    expect(clinicianForUsername(list, 'ana')?.id).toBe('ana');
    expect(clinicianForUsername(list, 'BO')?.id).toBe('bo');
    expect(clinicianForUsername(list, '  cass ')?.id).toBe('cass');
  });

  it('answers undefined for no match, an empty username, or none at all', () => {
    expect(clinicianForUsername(list, 'dana')).toBeUndefined();
    expect(clinicianForUsername(list, '   ')).toBeUndefined();
    expect(clinicianForUsername(list, undefined)).toBeUndefined();
  });

  it('answers undefined before the clinician list has loaded', () => {
    expect(clinicianForUsername([], 'ana')).toBeUndefined();
  });
});
