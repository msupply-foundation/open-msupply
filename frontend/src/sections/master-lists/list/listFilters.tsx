import { t } from '@/intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { MasterListsFilter } from './masterListsListState';

/*
 * The list's filter chips (spec/master-lists S1 › Filters).
 *
 * An EXHAUSTIVE, keyed map over every key of the generated
 * MasterListFilterInput (the reference vertical's completeness pattern): a key
 * maps to a definition to expose it, or `null` to dismiss it. Because the map
 * is a Record over all of MasterListsFilter, codegen adding a filter key breaks
 * compilation here until we decide expose-or-dismiss — nothing is exposed by
 * accident, and this map is BOTH the definition and the completeness proof.
 *
 * Only `name` is exposed. The read has supported narrowing by name all along
 * (rules › list population and scoping records the filter as wired to the URL
 * with no affordance behind it); this is the affordance. "Always-present" is
 * honoured by SEEDING the key in the list's DEFAULT_STATE, so the chip is there
 * on arrival with no menu step — the same shape the items and names lists use.
 *
 * NB: ui-surface asks for a dedicated search FIELD; that role is ⛔ not built
 * (components.md › inputs: "Free-text search / filter"), so it is substituted
 * by the built FilterBar text filter — the registry's sanctioned fallback
 * ("the filter-menu case is covered by FilterBar").
 */
const FILTERS: Filter<MasterListsFilter>[] =
  constructFilters<MasterListsFilter>({
    // ─ user-facing ──────────────────────────────────────────────────────────
    name: {
      label: () => t('label.name'),
      render: props => (
        <FilterTextInput
          label={t('label.name')}
          placeholder={t('placeholder.search')}
          // e2e hook: FilterBar supplies `filter-input-name` (TESTIDS.md).
          testId={props.testId}
          value={props.filter().name?.like ?? ''}
          // Blank box → null (FilterBar's "added but empty" marker), never
          // { like: '' } — the server treats "" as a real substring match.
          onInput={value =>
            props.setPartialFilter({ name: value ? { like: value } : null })
          }
        />
      ),
    },

    // ─ dismissed (applied by the page, or not user-facing) ──────────────────
    // Store scoping is the page's own filter, never a user chip: it is what
    // makes the list the store's list (rules › list population and scoping).
    existsForStoreId: null,
    // The detail-header lookup by id is gone with the detail screen (D80);
    // nothing user-facing narrows by id.
    id: null,
    // Code (export-only) and description (a column) are both narrowable on the
    // wire, but the screen offers one search, on name — the narrowing the
    // reference app wires to this list's URL.
    code: null,
    description: null,
    // Trading-partner and program narrowings belong to the master-list PICKERS
    // other verticals embed, not to this screen (README › scope).
    existsForName: null,
    existsForNameId: null,
    isProgram: null,
    itemId: null,
  });

export const masterListsFilters = (): Filter<MasterListsFilter>[] => FILTERS;
