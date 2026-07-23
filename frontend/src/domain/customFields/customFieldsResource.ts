import { createResource, createRoot } from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
import { CustomFieldDefinitions } from './customFields.generated';
import type { CustomFieldDef } from './customFields';

// Custom-field DEFINITIONS cache, keyed by scope (spec/ui-standards/custom-fields
// › definitions). Definitions come from central config/sync and are stable for
// the session, and the SAME scope is read by a list, a detail tab, and a
// toolbar at once — so one lazy, de-duplicated fetch per scope is shared by
// every consumer. Modelled on `createStoreScopedResource`, but keyed by the
// scope string (not the store): definitions are not store-scoped.
//
// The read is NON-SUSPENDING (kdd/solid-reactivity-pitfalls › no remounts on
// interaction): a detail tab first-fetches when the user switches to it, so a
// suspending read would tear down the open detail page. `noSuspense` gates on
// `resource.state`, never `.latest` alone.

export interface CustomFieldDefinitionsReader {
  /** The scope's definitions, read without ever suspending ([] until loaded). */
  noSuspense: () => CustomFieldDef[];
  /** True while the first fetch for this scope is in flight. */
  loading: () => boolean;
}

const cache = new Map<string, CustomFieldDefinitionsReader>();

const build = (scope: string): CustomFieldDefinitionsReader =>
  createRoot(() => {
    const [resource] = createResource(
      () => scope,
      async (s): Promise<CustomFieldDef[]> => {
        const result = await graphqlFetch(CustomFieldDefinitions, { scope: s });
        return result.kind === 'success' ? result.data.customFields.nodes : [];
      }
    );
    return {
      noSuspense: () =>
        resource.state === 'ready' || resource.state === 'refreshing'
          ? (resource.latest ?? [])
          : [],
      loading: () => resource.loading,
    };
  });

// The shared definitions reader for a scope — one per scope, cached for the
// session. Reading `noSuspense()` arms the lazy fetch.
export const customFieldDefinitions = (
  scope: string
): CustomFieldDefinitionsReader => {
  const existing = cache.get(scope);
  if (existing) return existing;
  const reader = build(scope);
  cache.set(scope, reader);
  return reader;
};
