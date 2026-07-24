import { graphqlFetch } from '../../api/graphql';
import { Clinicians, type CliniciansResult } from './clinician.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

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
