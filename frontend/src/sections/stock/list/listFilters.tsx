import { t } from '../../../intl';
import {
  FilterSelect,
  FilterTextInput,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { masterListsResource } from '../../../domain/masterList';
import {
  activityOptions,
  campaignKindLabel,
  campaignsResource,
} from '../../../domain/campaign';
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
// key order IS the toolbar's display order. Each exposed field reads its one
// key for the control value and writes it back in the GraphQL-native operator
// shape; an empty choice writes `null` (FilterBar's "added but empty" marker),
// which stripEmpty drops before the query (so an empty chip doesn't reflash the
// list).
const ALL_FILTERS: Filter<StockFilter>[] = constructFilters<StockFilter>({
  // ─ user-facing, in display order ────────────────────────────────────────
  // Free-text search: matches item code, item name, OR batch (one server OR
  // filter) — spec/stock OMS-REG-INV-02.2/.3/.21.
  search: {
    label: () => t('label.search'),
    render: props => (
      <FilterTextInput
        label={t('label.search')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
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
  // Activity — single-select of the campaign register (both kinds), matching
  // the line's campaign. Each option reads back qualified by its kind, as the
  // Activity picker does, since a name can repeat across the two kinds. Options
  // go through activityOptions so the order matches the picker — routine
  // entries first, then campaigns — rather than the name-sorted interleaving.
  // Offered only when the register has entries (gated in filterFields below).
  campaignId: {
    label: () => t('label.activity'),
    render: props => (
      <FilterSelect
        label={t('label.activity')}
        testId={props.testId}
        value={props.filter().campaignId?.equalTo ?? ''}
        options={[
          { value: '', label: t('label.any') },
          ...activityOptions(campaignsResource.noSuspense(), 'all').map(o => ({
            value: o.node.id,
            label: `${campaignKindLabel(o.kind)} · ${o.node.name}`,
          })),
        ]}
        onChange={value =>
          props.setPartialFilter({
            campaignId: value ? { equalTo: value } : null,
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
        placeholder={t('placeholder.search')}
        value={props.filter().location?.codeOrName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            location: value ? { codeOrName: { like: value } } : null,
          })
        }
      />
    ),
  },
  // Expiry — a `Date` scalar; FilterDateRange (type="date") passes the plain
  // ISO dates through, no conversion (#456).
  expiryDate: {
    label: () => t('label.expiry-date'),
    render: props => (
      <FilterDateRange
        type="date"
        label={t('label.expiry-date')}
        testId={props.testId}
        value={props.filter().expiryDate}
        onChange={value => props.setPartialFilter({ expiryDate: value })}
      />
    ),
  },
  // On hold — Any / Yes / No over the plain Boolean filter field (#1787); the
  // wire value is the boolean itself, carried as its string form in the
  // select.
  onHold: {
    label: () => t('label.on-hold'),
    render: props => (
      <FilterSelect
        label={t('label.on-hold')}
        testId={props.testId}
        value={
          props.filter().onHold == null ? '' : String(props.filter().onHold)
        }
        options={[
          { value: '', label: t('label.any') },
          { value: 'true', label: t('messages.yes') },
          { value: 'false', label: t('messages.no') },
        ]}
        onChange={value =>
          props.setPartialFilter({
            onHold: value === '' ? null : value === 'true',
          })
        }
      />
    ),
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
});

// The filters offered, gated reactively (spec/stock S1 › filters):
//  - VVM status only when manageVvmStatusForStock is on.
//  - Master list only when the store has any master lists.
//  - Activity only when the campaign register has any entries.
// ALL_FILTERS is a stable module const (labels are accessors), so filtering it
// keeps each Filter's identity — FilterBar's <For> reuses chips, no remount.
export const filterFields = (): Filter<StockFilter>[] => {
  const prefs = stockPreferences();
  const hasMasterLists = masterListsResource.noSuspense().length > 0;
  const hasCampaigns = campaignsResource.noSuspense().length > 0;
  return ALL_FILTERS.filter(f => {
    if (f.key === 'vvmStatusId') return prefs.manageVvmStatusForStock;
    if (f.key === 'masterList') return hasMasterLists;
    if (f.key === 'campaignId') return hasCampaigns;
    return true;
  });
};
