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

/**
 * The stores carrying these exact codes — what a CSV naming a store needs.
 *
 * NOT a page of the register filtered afterwards. A central server holds
 * thousands of stores and a page is 30, so scanning one and hoping the file's
 * store is on it is not a lookup: it refuses a file the app itself exported,
 * and says the code does not exist when it plainly does.
 *
 * One bounded request per distinct code, because the wire cannot do better —
 * `StoreFilterInput.code` is a `StringFilterInput`, which has only `equalTo`
 * and `like`, no `equalAny`. `equalTo` is case-SENSITIVE and a file's code is
 * matched case-insensitively, so this asks with `like` — a substring match —
 * and keeps only the exact answers. A code nothing matches simply yields
 * nothing, which is the same outcome as a typo.
 */
export const fetchStoresByCode = async (
  codes: readonly string[]
): Promise<StoreOption[]> => {
  const found = new Map<string, StoreOption>();
  await Promise.all(
    codes.map(async code => {
      const wanted = code.trim().toLowerCase();
      if (!wanted) return;
      const result = await graphqlFetch(
        StoreSearch,
        { filter: { code: { like: code } }, page: { first: PAGE_SIZE, offset: 0 } },
        { background: true }
      );
      if (result.kind !== 'success') return;
      for (const node of result.data.stores.nodes)
        if (node.code.trim().toLowerCase() === wanted) found.set(node.id, node);
    })
  );
  return [...found.values()];
};
