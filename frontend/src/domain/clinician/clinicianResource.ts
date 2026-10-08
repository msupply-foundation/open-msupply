import { graphqlFetch } from '../../api/graphql';
import { Clinicians, type CliniciansResult } from './clinician.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';
import { authUser } from '../../auth/authContext';

// One clinician (id + code + names).
export type Clinician = CliniciansResult['clinicians']['nodes'][number];

/** The picker's display form: "Last, First". */
export const clinicianName = (clinician: Clinician): string =>
  [clinician.lastName, clinician.firstName].filter(Boolean).join(', ');

// App-wide store-scoped clinician cache (spec/prescriptions § patient,
// clinician, program, diagnosis: the clinician picker offers the store's
// ACTIVE clinician list — the offered set is the only guard the server has at
// creation, a captured gap). Same shape as reasonOptionsResource: lazy,
// deduped, module-scope singleton, read via `.noSuspense()`; a store switch
// re-fetches.
export const cliniciansResource = createStoreScopedResource<Clinician>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(Clinicians, { storeId });
    return result.kind === 'success' ? result.data.clinicians.nodes : undefined;
  }
);

/**
 * The clinician a username names: the one whose **code** is that username
 * (spec/prescription-requests § who is recorded, issue #513).
 *
 * A convention, not a link — nothing in the schema ties an account to a
 * clinician — so it is matched leniently (trimmed, case-insensitive), and a
 * miss is ordinary: `undefined` means "no default", never an error. The FIRST
 * match wins; clinician codes are not unique, and there is nothing here to
 * break a tie with.
 */
export const clinicianForUsername = (
  clinicians: readonly Clinician[],
  username: string | undefined
): Clinician | undefined => {
  const wanted = username?.trim().toLowerCase();
  if (!wanted) return undefined;
  return clinicians.find(
    clinician => clinician.code.trim().toLowerCase() === wanted
  );
};

/**
 * The clinician the SIGNED-IN user most likely is — `clinicianForUsername`
 * over the current session and the store's clinician list. A prescriber
 * entering their own script is the common case, so the prescribing surfaces
 * offer this as the default pick rather than making them find themselves in
 * the list.
 *
 * Reactive, and reads the clinician cache non-suspending: it answers
 * `undefined` until the list has loaded, and the match once it has.
 */
export const clinicianMatchingUser = (): Clinician | undefined =>
  clinicianForUsername(cliniciansResource.noSuspense(), authUser()?.username);
