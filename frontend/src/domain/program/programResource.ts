import { graphqlFetch } from '../../api/graphql';
import {
  ProgramRegistries,
  type ProgramRegistriesResult,
} from './program.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

// One program-enrolment registry node — a pickable program. The picker
// submits `contextId` (the program's context, what report data queries
// filter by), not the registry's own id (spec/reports contract "Arguments").
export type ProgramRegistry =
  ProgramRegistriesResult['documentRegistries']['nodes'][number];

// App-wide program-registries cache: fetched once per store, shared/deduped,
// refetched on store change (createStoreScopedResource). The server already
// restricts results to program contexts the user may see; an empty list is
// the common case on stores without the program module.
export const programRegistriesResource =
  createStoreScopedResource<ProgramRegistry>(currentStoreId, async storeId => {
    const result = await graphqlFetch(ProgramRegistries, { storeId });
    return result.kind === 'success'
      ? result.data.documentRegistries.nodes
      : undefined;
  });
