import { graphqlFetch } from '../../api/graphql';
import type { Page } from '../../ui/utils/createPaginatedSearch';
import {
  StoreSearch,
  type StoreSearchResult,
  type StoreSearchVariables,
} from './store.generated';

// The generated filter shape, used verbatim (kdd/type-safety: no remapping).
type StoreFilter = NonNullable<StoreSearchVariables['filter']>;

/**
 * One store option — the generated node itself, not a parallel model. Carries
 * `siteId` for the site editor; the destination pickers ignore it.
 */
export type StoreOption = StoreSearchResult['stores']['nodes'][number];

const PAGE_SIZE = 30;

/**
 * The picker's server filter.
 *
 * Both clauses are OMITTED when they have nothing to say, which is
 * load-bearing in each case:
 *
 * - an empty search must send no `codeOrName` at all — `{ like: '' }` is a
 *   real substring match to the server, not "match everything";
 * - an empty exclusion must send no `id` clause at all, rather than
 *   `notEqualAll: []`, so "exclude nothing" never depends on how the server
 *   reads an empty list.
 */
export const storeSearchFilter = (
  search: string,
  excludeIds: readonly string[] = []
): StoreFilter => ({
  ...(search ? { codeOrName: { like: search } } : {}),
  ...(excludeIds.length ? { id: { notEqualAll: [...excludeIds] } } : {}),
});

/**
 * One page of stores for `AsyncCombobox`. `excludeIds` is an ACCESSOR, read at
 * fetch time, so a caller whose exclusion set changes as the user works (the
 * site editor's draft) needs no re-wiring.
 */
export const storePageFetcher =
  (excludeIds: () => readonly string[] = () => []) =>
  async (
    search: string,
    offset: number
  ): Promise<Page<StoreOption> | undefined> => {
    const result = await graphqlFetch(StoreSearch, {
      filter: storeSearchFilter(search, excludeIds()),
      // Sorted by name in the document itself — stable across pages, so
      // infinite scroll never reshuffles rows as new pages append.
      page: { first: PAGE_SIZE, offset },
    });
    if (result.kind !== 'success') return undefined;
    return {
      nodes: result.data.stores.nodes,
      totalCount: result.data.stores.totalCount,
    };
  };
