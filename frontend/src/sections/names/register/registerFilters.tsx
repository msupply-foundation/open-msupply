import { t } from '@/intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { FacilitiesFilter } from './facilityRegisterLogic';

/*
 * The facility register's ONE filter (spec/names S5 § filters & search): a
 * free-text search the server matches against both name and code
 * (`codeOrName`), case-insensitively and on a partial match. The register has
 * no custom-field filters — the properties it records are the name-property
 * system, edited in the facility editor rather than listed (`.27`).
 *
 * An EXHAUSTIVE, keyed map over every key of the generated NameFilterInput (the
 * reference vertical's completeness pattern): a key maps to a definition to
 * expose it, or `null` to dismiss it. Because the map is a Record over all of
 * FacilitiesFilter, codegen adding a filter key breaks compilation here until
 * we decide expose-or-dismiss — nothing is exposed by accident.
 */
const REGISTER_FILTERS: Filter<FacilitiesFilter>[] =
  constructFilters<FacilitiesFilter>({
    // ─ user-facing
    codeOrName: {
      label: () => t('label.code-or-name'),
      render: props => (
        <FilterTextInput
          label={t('label.code-or-name')}
          placeholder={t('placeholder.enter-code-or-name')}
          // e2e hook: FilterBar supplies `filter-input-codeOrName`
          // (TESTIDS.md).
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

    // ─ dismissed (applied by the page, or not user-facing)
    // The membership test itself — never a removable user chip.
    isStore: null,
    // The register applies no type restriction and no visibility filter: it
    // carries names of any kind that happen to be stores, including the active
    // store's own (contract § which names qualify).
    type: null,
    isVisible: null,
    isSystemName: null,
    // The three flag COLUMNS are per-row readings, not narrowings.
    isCustomer: null,
    isSupplier: null,
    isDonor: null,
    isManufacturer: null,
    // codeOrName covers both; the name-only / code-only matches aren't offered.
    name: null,
    code: null,
    storeCode: null,
    // Custom-field filtering is the customer/supplier lists' surface, not this
    // one (rules § filtering & search).
    dynamicFilter: null,
    // Relational / contact filters — not list filters here.
    phone: null,
    address1: null,
    address2: null,
    country: null,
    email: null,
    id: null,
    supplyingStoreId: null,
  });

export const registerFilters = (): Filter<FacilitiesFilter>[] =>
  REGISTER_FILTERS;
