import { t } from '../../../intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import type { NamesFilter } from './namesListLogic';

// Filter definitions for the Customer & Supplier lists (spec/names). The search
// (codeOrName) is always present; the per-custom-field filters come from the
// role's configured definitions.

/*
 * The SEARCH filter — an EXHAUSTIVE, keyed map over every key of the generated
 * NameFilterInput (the reference vertical's completeness pattern): a key maps to
 * a definition to expose it, or `null` to dismiss it. Because the map is a
 * Record over all of NamesFilter, codegen adding a filter key breaks
 * compilation here until we decide expose-or-dismiss — nothing is exposed by
 * accident, and this map is BOTH the definition and the completeness proof.
 *
 * Only `codeOrName` is exposed: a single free-text box that the server matches
 * against BOTH name and code (contract › filtering & search; AC-N13;
 * DIVERGENCES D18). Everything else is dismissed — role/type/visibility are
 * applied by the page (not user chips), and the rest are programmatic.
 *
 * NB: ui-surface asks for an always-present dedicated search FIELD; that role is
 * ⛔ not built (components.md › inputs: "Free-text search / filter"), so it is
 * substituted by the built FilterBar text filter — the registry's sanctioned
 * fallback ("the filter-menu case is covered by FilterBar"). See BUILD_REPORT.
 */
const SEARCH_FILTERS: Filter<NamesFilter>[] = constructFilters<NamesFilter>({
  // ─ user-facing
  codeOrName: {
    label: () => t('name.filter.search'),
    render: props => (
      <FilterTextInput
        label={t('name.filter.search')}
        placeholder={t('name.filter.search-placeholder')}
        // e2e hook: FilterBar supplies `filter-input-codeOrName` (TESTIDS.md).
        testId={props.testId}
        value={props.filter().codeOrName?.like ?? ''}
        // Blank box → null (FilterBar's "added but empty" marker), never
        // { like: '' } — the server treats "" as a real substring match.
        onInput={value =>
          props.setPartialFilter({
            codeOrName: value ? { like: value } : null,
          })
        }
      />
    ),
  },

  // ─ dismissed (applied by the page, or not user-facing) ────────────────────
  // Role + type + visibility scope the list itself — never user chips.
  isCustomer: null,
  isSupplier: null,
  isVisible: null,
  isSystemName: null,
  type: null,
  // name/code have a combined search above (codeOrName); the separate
  // name-only / code-only matches are not surfaced.
  name: null,
  code: null,
  // Custom-field filtering rides on dynamicFilter via its own bar (below), not
  // as a NameFilterInput chip.
  dynamicFilter: null,
  // Other name roles / relational / contact filters — not list filters here.
  isManufacturer: null,
  isDonor: null,
  isStore: null,
  storeCode: null,
  phone: null,
  address1: null,
  address2: null,
  country: null,
  email: null,
  id: null,
  supplyingStoreId: null,
});

export const searchFilters = (): Filter<NamesFilter>[] => SEARCH_FILTERS;

// The custom-field filters (AC-N18/N19) are the shared builder — one text
// filter per configured field for the role's scope; none configured ⇒ none.
// Re-exported so the list keeps importing filters from one place.
export {
  customFieldFilters,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
