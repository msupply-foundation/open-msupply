import { t } from '../../../intl';
import {
  FilterSelect,
  FilterTextInput,
  FilterDate,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { masterListsResource } from '../../../domain/masterList';
import { vvmStatusesResource } from '../../../domain/vvmStatus';
import { stockPreferences } from '../../../store/storeContext';
import type { StockLinesVariables } from './stock.generated';

// The stock list filter object, exactly the generated GraphQL filter shape
// (kdd/type-safety: no remapping) — flows straight through FilterBar.
export type StockFilter = NonNullable<StockLinesVariables['filter']>;

// Type-driven, EXHAUSTIVE filter definitions (the spec's deliberate-filters
// requirement — same pattern as the stocktakes list). The map is keyed by EVERY
// key of StockLineFilterInput: a key maps to a definition to expose it, or
// `null` to dismiss it. Being a Record over all keys, it stops compiling when
// the schema grows a filter — forcing an expose-or-dismiss decision. The map's
// key order IS the toolbar's display order. Each exposed field reads its one key
// for the control value and writes it back in the GraphQL-native operator shape;
// an empty choice writes `null` (FilterBar's "added but empty" marker), which
// stripEmpty drops before the query (so an empty chip doesn't reflash the list).
const ALL_FILTERS: Filter<StockFilter>[] = constructFilters<StockFilter>({
  // ─ user-facing, in display order ────────────────────────────────────────
  // Free-text search: matches item code, item name, OR batch (one server OR
  // filter) — spec/stock AC-L2.
  search: {
    label: () => t('label.search'),
    render: props => (
      <FilterTextInput
        label={t('label.search')}
        testId={props.testId}
        placeholder={t('placeholder.enter-an-item-code-or-name')}
        value={props.filter().search?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ search: value ? { like: value } : null })
        }
      />
    ),
  },
  // Master list — single-select of the store's master lists (items on the
  // chosen list). Offered only when the store has master lists (gated in
  // filterFields below).
  masterList: {
    label: () => t('label.master-list'),
    render: props => (
      <FilterSelect
        label={t('label.master-list')}
        testId={props.testId}
        value={props.filter().masterList?.id?.equalTo ?? ''}
        options={[
          { value: '', label: t('label.any') },
          ...masterListsResource
            .noSuspense()
            .map(ml => ({ value: ml.id, label: ml.name })),
        ]}
        onChange={value =>
          props.setPartialFilter({
            masterList: value ? { id: { equalTo: value } } : null,
          })
        }
      />
    ),
  },
  // Location — matches location code OR name (contains).
  location: {
    label: () => t('label.location'),
    render: props => (
      <FilterTextInput
        label={t('label.location')}
        testId={props.testId}
        placeholder={t('label.location')}
        value={props.filter().location?.codeOrName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            location: value ? { codeOrName: { like: value } } : null,
          })
        }
      />
    ),
  },
  // Expiry — a from/to date range (two native date inputs in one chip). A range
  // is present as { afterOrEqualTo?, beforeOrEqualTo? }; clearing both → null so
  // stripEmpty drops the empty chip.
  expiryDate: {
    label: () => t('label.expiry-date'),
    render: props => {
      const range = () => props.filter().expiryDate ?? {};
      const setBound = (
        bound: 'afterOrEqualTo' | 'beforeOrEqualTo',
        value: string
      ) => {
        const next = { ...range(), [bound]: value || undefined };
        const empty = !next.afterOrEqualTo && !next.beforeOrEqualTo;
        props.setPartialFilter({ expiryDate: empty ? null : next });
      };
      return (
        <>
          <FilterDate
            label={t('label.from')}
            testId={`${props.testId}-from`}
            value={range().afterOrEqualTo ?? ''}
            onInput={value => setBound('afterOrEqualTo', value)}
          />
          <FilterDate
            label={t('label.to')}
            testId={`${props.testId}-to`}
            value={range().beforeOrEqualTo ?? ''}
            onInput={value => setBound('beforeOrEqualTo', value)}
          />
        </>
      );
    },
  },
  // VVM status — single-select of active VVM statuses. Offered only when
  // manageVvmStatusForStock is on (gated in filterFields below).
  vvmStatusId: {
    label: () => t('label.vvm-status'),
    render: props => (
      <FilterSelect
        label={t('label.vvm-status')}
        testId={props.testId}
        value={props.filter().vvmStatusId?.equalTo ?? ''}
        options={[
          { value: '', label: t('label.any') },
          ...vvmStatusesResource
            .noSuspense()
            .map(s => ({ value: s.id, label: s.description })),
        ]}
        onChange={value =>
          props.setPartialFilter({
            vvmStatusId: value ? { equalTo: value } : null,
          })
        }
      />
    ),
  },

  // ─ dismissed (not user-facing) ──────────────────────────────────────────
  // The packs-on-hand gate is always-on, set in the list's query variables
  // (hasPacksInStore: true), not a user filter.
  hasPacksInStore: null,
  // Search covers item code / name / batch; these narrower item filters aren't
  // surfaced separately.
  code: null,
  name: null,
  itemCodeOrName: null,
  // isProgramStockLine ignores its value server-side (contract wire trap) —
  // never surfaced.
  isProgramStockLine: null,
  // Identity / relational / programmatic filters — not user-facing.
  id: null,
  itemId: null,
  locationId: null,
  storeId: null,
  isAvailable: null,
  isActive: null,
  campaignId: null,
});

// The filters offered, gated reactively (spec/stock S1 › filters):
//  - VVM status only when manageVvmStatusForStock is on.
//  - Master list only when the store has any master lists.
//  - While grouped-by-item, only item-level filters (Search, Master list) —
//    the stock-line-only filters (Location, Expiry, VVM) are not offered and are
//    cleared on switching (handled by the list).
// ALL_FILTERS is a stable module const (labels are accessors), so filtering it
// keeps each Filter's identity — FilterBar's <For> reuses chips, no remount.
export const filterFields = (grouped: boolean): Filter<StockFilter>[] => {
  const prefs = stockPreferences();
  const hasMasterLists = masterListsResource.noSuspense().length > 0;
  const itemLevelKeys = new Set(['search', 'masterList']);
  return ALL_FILTERS.filter(f => {
    if (grouped && !itemLevelKeys.has(f.key)) return false;
    if (f.key === 'vvmStatusId') return prefs.manageVvmStatusForStock;
    if (f.key === 'masterList') return hasMasterLists;
    return true;
  });
};

// The stock-line-only filter keys cleared when switching to the grouped view
// (spec/stock S1 › grouped-by-item). Search + Master list survive.
export const STOCK_LINE_ONLY_FILTER_KEYS: (keyof StockFilter)[] = [
  'location',
  'expiryDate',
  'vvmStatusId',
];
