import { afterEach, describe, expect, it, vi } from 'vitest';

// A real signal behind authUser, so signing out is a change the kept visits
// can see. Hoisted: vi.mock's factory runs before the module's own imports.
const auth = vi.hoisted(() => ({
  setUser: (_user: unknown): void => {},
}));
vi.mock('../../../auth/authContext', async () => {
  const { createSignal } = await import('solid-js');
  const [user, setUser] = createSignal<unknown>({ userId: 'u1' });
  auth.setUser = value => setUser(() => value);
  return { authUser: user };
});

import { forgetKeptVisits, leaveVisit, visitFor } from './keptVisit';

const line = { itemId: 'item-1', units: 2 } as never;
const off = () => false;

afterEach(() => {
  forgetKeptVisits();
  auth.setUser({ userId: 'u1' });
});

// spec/prescriptions rules › Dispensing records
describe('the Simple screen’s kept visit', () => {
  // OMS-REG-DIS-12.222, .223
  it('is the same visit when the screen opens again, with its list and person', () => {
    const first = visitFor('store-a', off);
    first.setLines([line]);
    first.setPatient({ id: 'p1', name: 'Malfoy, Draco' } as never);
    leaveVisit('store-a', first);

    const again = visitFor('store-a', off);
    expect(again).toBe(first);
    expect(again.lines).toHaveLength(1);
    expect(again.patient()?.id).toBe('p1');
  });

  // OMS-REG-DIS-12.223: the unnamed patient with a list is kept too
  it('keeps the unnamed patient with its list', () => {
    const first = visitFor('store-a', off);
    first.setUnnamed(true);
    first.setLines([line]);
    leaveVisit('store-a', first);
    expect(visitFor('store-a', off).unnamed()).toBe(true);
  });

  // OMS-REG-DIS-12.228
  it('keeps nothing when left with an empty list and no registered patient', () => {
    const first = visitFor('store-a', off);
    first.setUnnamed(true);
    leaveVisit('store-a', first);

    const again = visitFor('store-a', off);
    expect(again).not.toBe(first);
    expect(again.unnamed()).toBe(false);
  });

  it('keeps a registered patient chosen with nothing on the list yet', () => {
    const first = visitFor('store-a', off);
    first.setPatient({ id: 'p1', name: 'Malfoy, Draco' } as never);
    leaveVisit('store-a', first);
    expect(visitFor('store-a', off)).toBe(first);
  });

  // OMS-REG-DIS-12.225: a save still out is the visit's, not the screen's
  it('keeps a visit whose save is still out, and the save finishes into it', () => {
    const first = visitFor('store-a', off);
    first.setLines([line]);
    first.setDispensing(true);
    first.record.current = { id: 'visit-1' };
    leaveVisit('store-a', first);

    // The save lands after the screen closed: the visit is ready for the next
    // person, and the screen opening again shows that, not the old list.
    first.record.current = undefined;
    first.setLines([]);
    first.setDispensing(false);
    first.setNotice({ severity: 'success', text: 'Dispensed' });

    const again = visitFor('store-a', off);
    expect(again).toBe(first);
    expect(again.lines).toHaveLength(0);
    expect(again.notice()?.text).toBe('Dispensed');
  });

  it('keeps a visit held after a lost reply', () => {
    const first = visitFor('store-a', off);
    first.record.current = { id: 'visit-1' };
    first.setUnconfirmed(true);
    leaveVisit('store-a', first);
    expect(visitFor('store-a', off).record.current?.id).toBe('visit-1');
  });

  it('starts a new visit with the unnamed patient where the store says so', () => {
    expect(visitFor('store-a', () => true).unnamed()).toBe(true);
  });

  // OMS-REG-DIS-12.226
  it('keeps one visit per store', () => {
    const a = visitFor('store-a', off);
    a.setLines([line]);
    const b = visitFor('store-b', off);
    expect(b).not.toBe(a);
    expect(b.lines).toHaveLength(0);
  });

  it('keeps one visit per user', () => {
    const mine = visitFor('store-a', off);
    mine.setLines([line]);
    auth.setUser({ userId: 'u2' });
    expect(visitFor('store-a', off).lines).toHaveLength(0);
  });

  // OMS-REG-DIS-12.227
  it('drops every kept visit on sign-out', async () => {
    const first = visitFor('store-a', off);
    first.setLines([line]);
    auth.setUser(undefined);
    // The sign-out effect runs once the change settles.
    await Promise.resolve();
    auth.setUser({ userId: 'u1' });
    expect(visitFor('store-a', off).lines).toHaveLength(0);
  });
});
