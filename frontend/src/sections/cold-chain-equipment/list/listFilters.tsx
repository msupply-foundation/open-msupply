import { t } from '@/intl';
import {
  FilterDate,
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { ASSET_STATUSES, statusLabelKey } from '../equipment';
import type { AssetStatus } from '../equipment';
import type { AssetUserFilter } from './listState';

/*
 * Type-driven, EXHAUSTIVE filter definitions for the equipment list
 * (ui-surface S1 § filters). The map is keyed by EVERY user-settable key of
 * the generated AssetFilterInput — a key maps to a definition to expose it, or
 * `null` to dismiss it — so when the schema gains a filter, codegen adds the
 * key and this map stops compiling until we decide expose-or-dismiss (the
 * reference vertical's pattern).
 *
 * Which of these the user sees FIRST is `DEFAULT_STATE` in listState (the four
 * seeded as empty chips); the rest are added from the filter menu.
 *
 * ⚠️ THE RETURNED ARRAY MUST BE STABLE. FilterBar renders its chips with
 * `<For each={activeFilters(props.filters, props.filter)}>`, and that reads
 * `props.filters` again on every filter change — so a caller that rebuilds the
 * array per read hands <For> brand-new Filter objects on every keystroke, <For>
 * remounts every chip, and the input being typed into is destroyed and
 * recreated mid-word (kdd/solid-reactivity-pitfalls § no remounts on
 * interaction). Callers memoise this; see EquipmentList.
 *
 * Everything variable is therefore an ACCESSOR read lazily inside `render`,
 * never a value captured at build time — the category and type option lists
 * arrive from the catalogue after this array is built, and must not rebuild it
 * when they do. `showStore` is the one exception: it decides whether a key is
 * in the map at all, so it is read at build time and a caller's memo re-runs
 * the once it can flip.
 */

export interface FilterOption {
  id: string;
  name: string;
}

export const equipmentFilters = (options: {
  categories: () => FilterOption[];
  types: () => FilterOption[];
  /**
   * Central + Manage only: the store column and its filter (AC-S6/AC-S7). Read
   * at build time — it decides whether the key is in the map at all — so a
   * caller's memo re-runs when it flips, which it does at most once.
   */
  showStore: () => boolean;
}): Filter<AssetUserFilter>[] =>
  constructFilters<AssetUserFilter>({
    // ─ user-facing, in display order ───────────────────────────────────────
    functionalStatus: {
      label: () => t('label.functional-status'),
      render: props => (
        <FilterSelect<AssetStatus>
          label={t('label.functional-status')}
          testId={props.testId}
          value={props.filter().functionalStatus?.equalTo ?? ''}
          options={[
            { value: '', label: t('label.all') },
            ...ASSET_STATUSES.map(status => ({
              value: status,
              label: t(statusLabelKey(status)),
            })),
          ]}
          // Exactly one status, or none — the empty choice clears the filter
          // rather than sending `{ equalTo: '' }`. An asset with no status
          // entry matches NO value of it (AC-L9).
          onChange={value =>
            props.setPartialFilter({
              functionalStatus: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    categoryId: {
      label: () => t('label.category'),
      render: props => (
        <FilterSelect
          label={t('label.category')}
          testId={props.testId}
          value={props.filter().categoryId?.equalTo ?? ''}
          options={[
            { value: '', label: t('label.all') },
            ...options
              .categories()
              .map(category => ({ value: category.id, label: category.name })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              categoryId: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    assetNumber: {
      label: () => t('label.asset-number'),
      render: props => (
        <FilterTextInput
          label={t('label.asset-number')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().assetNumber?.like ?? ''}
          // `like`, never `equalTo`: the chip is a contains search. Blank box →
          // null, never `{ like: '' }`, which would match everything.
          onInput={value =>
            props.setPartialFilter({
              assetNumber: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    serialNumber: {
      label: () => t('label.serial'),
      render: props => (
        <FilterTextInput
          label={t('label.serial')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().serialNumber?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              serialNumber: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    isNonCatalogue: {
      label: () => t('label.non-catalogue'),
      render: props => (
        <FilterSelect
          label={t('label.non-catalogue')}
          testId={props.testId}
          value={
            props.filter().isNonCatalogue === undefined ||
            props.filter().isNonCatalogue === null
              ? ''
              : String(props.filter().isNonCatalogue)
          }
          options={[
            { value: '', label: t('label.all') },
            { value: 'true', label: t('label.non-catalogue') },
            { value: 'false', label: t('label.catalogue') },
          ]}
          onChange={value =>
            props.setPartialFilter({
              isNonCatalogue: value === '' ? null : value === 'true',
            })
          }
        />
      ),
    },
    typeId: {
      label: () => t('label.type'),
      render: props => (
        <FilterSelect
          label={t('label.type')}
          testId={props.testId}
          value={props.filter().typeId?.equalTo ?? ''}
          // Only the types of the chosen category (AC-L6). Choosing a category
          // that does not contain the chosen type clears it — that is
          // `clearTypeOutsideCategory`, applied by the list (AC-L7).
          options={[
            { value: '', label: t('label.all') },
            ...options
              .types()
              .map(type => ({ value: type.id, label: type.name })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              typeId: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    installationDate: {
      label: () => t('label.installation-date'),
      render: props => (
        <FilterDate
          label={t('label.installation-date')}
          testId={props.testId}
          value={props.filter().installationDate?.equalTo ?? ''}
          onInput={value =>
            props.setPartialFilter({
              installationDate: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    replacementDate: {
      label: () => t('label.replacement-date'),
      render: props => (
        <FilterDate
          label={t('label.replacement-date')}
          testId={props.testId}
          value={props.filter().replacementDate?.equalTo ?? ''}
          onInput={value =>
            props.setPartialFilter({
              replacementDate: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    notes: {
      label: () => t('label.notes'),
      render: props => (
        <FilterTextInput
          label={t('label.notes')}
          testId={props.testId}
          placeholder={t('placeholder.search-by-notes')}
          value={props.filter().notes?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({ notes: value ? { like: value } : null })
          }
        />
      ),
    },
    // Offered only where the Store column is (AC-S6): a central server's
    // Manage › Equipment. Matches the store's code OR its name.
    storeCodeOrName: options.showStore()
      ? {
          label: () => t('label.store'),
          render: props => (
            <FilterTextInput
              label={t('label.store')}
              testId={props.testId}
              placeholder={t('placeholder.search')}
              value={props.filter().storeCodeOrName?.like ?? ''}
              onInput={value =>
                props.setPartialFilter({
                  storeCodeOrName: value ? { like: value } : null,
                })
              }
            />
          ),
        }
      : null,

    // ─ dismissed (not user-facing) ─────────────────────────────────────────
    // The list read honours a catalogue-item filter, but no control on the
    // screen sets one — the Non-catalogue chip is the question a user actually
    // asks of it (ui-surface S1 § filters).
    catalogueItemId: null,
  });
