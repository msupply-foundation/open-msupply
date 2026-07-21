import { graphqlFetch } from '../../api/graphql';
import {
  ProgramRegistries,
  Programs,
  type ProgramRegistriesResult,
  type ProgramsResult,
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

// One pickable program for the report argument program picker (AC-R12) —
// exactly the node the Programs operation selects (kdd/type-safety).
export type ProgramListItem = Extract<
  ProgramsResult['programs'],
  { __typename: 'ProgramConnector' }
>['nodes'][number];

// The store's visible programs, name-sorted. A plain never-throwing fetch in
// the fetchLocations style: read once when an argument form opens — not a
// store-scoped singleton (reports are the only consumer today).
export const fetchPrograms = async (
  storeId: string
): Promise<ProgramListItem[]> => {
  const result = await graphqlFetch(Programs, { storeId });
  return result.kind === 'success' ? result.data.programs.nodes : [];
};
