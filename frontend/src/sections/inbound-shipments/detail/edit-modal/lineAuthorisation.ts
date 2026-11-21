// What the line editor lets a user do with a batch's authorisation state
// (spec inbound-shipments rules → line authorisation). Passing or rejecting a
// batch is the sign-off, and takes the authorise permission; anyone who may
// edit the shipment may send a batch back to Pending. The server checks all of
// this — the editor mirrors it so it never takes a sign-off the server
// refuses (rules → permissions).

import type { InboundLineFragment } from '../inboundShipmentDetail.generated';

/** The three states a batch can hold (the fragment's non-null set). */
export type AuthStatus = NonNullable<InboundLineFragment['status']>;

export const AUTH_STATUSES: readonly AuthStatus[] = [
  'PENDING',
  'PASSED',
  'REJECTED',
];

/** Passed and Rejected are the sign-off. */
export const isSignedOff = (status: AuthStatus | null | undefined): boolean =>
  status === 'PASSED' || status === 'REJECTED';

/**
 * The states the Auth status field offers for a batch. With the authorise
 * permission, all three. Without it, Pending, plus the state the batch was
 * saved with so the field can show it and the user can change their mind
 * (OMS-FUN-ISE-001.15, .16). A new batch has no saved state, so it offers
 * Pending alone.
 */
export const authStatusOptions = (
  canAuthorise: boolean,
  saved: AuthStatus | null
): AuthStatus[] =>
  AUTH_STATUSES.filter(
    status => canAuthorise || status === 'PENDING' || status === saved
  );

/**
 * Whether a batch's details are closed to this user: it is signed off and
 * they can't authorise (OMS-FUN-ISE-001.15). Read from the batch's current
 * state, so sending it back to Pending reopens it in the same save (.16).
 */
export const lockedBySignOff = (
  canAuthorise: boolean,
  status: AuthStatus | null
): boolean => !canAuthorise && isSignedOff(status);

/**
 * The updates worth sending: only batches that differ from how they were
 * loaded. Resending an untouched signed-off batch reads to the server as a
 * change to it, which needs the authorise permission, and would refuse a save
 * that only added a batch beside it (OMS-FUN-ISE-001.14). `loaded` holds each
 * batch's update as first built, keyed by id; a batch missing from it is sent.
 */
export const changedUpdates = <T extends { id: string }>(
  updates: T[],
  loaded: ReadonlyMap<string, string>
): T[] => updates.filter(u => loaded.get(u.id) !== JSON.stringify(u));

/**
 * Whether picking `next` for a batch puts it back as it was loaded. A user
 * without the authorise permission is offered a signed-off state only when the
 * batch was saved with it; picking it again closes the batch to them, so it
 * returns to its loaded state, edits made while it was Pending dropped, rather
 * than send a change the server refuses (OMS-FUN-ISE-001.15).
 */
export const restoresLoadedBatch = (
  canAuthorise: boolean,
  saved: AuthStatus | null,
  next: AuthStatus
): boolean => !canAuthorise && isSignedOff(next) && next === saved;
