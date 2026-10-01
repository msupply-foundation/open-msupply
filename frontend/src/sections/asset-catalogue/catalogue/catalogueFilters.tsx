import { t } from '@/intl';
import {
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { AssetCatalogueItemsVariables } from './catalogue.generated';

// The filter object exactly as GraphQL takes it (kdd/type-safety).
export type CatalogueFilter = NonNullable<
  AssetCatalogueItemsVariables['filter']
>;

type Named = { id: string; name: string };
type TypeOption = Named & { categoryId: string };

/** Only the chosen category's types, or every type while none is chosen
 *  (rules § reading the catalogue). */
export const typesFor = (
  types: readonly TypeOption[],
  categoryId: string | null | undefined
): TypeOption[] =>
  categoryId
    ? types.filter(type => type.categoryId === categoryId)
    : [...types];

/*
 * The catalogue list's six filters (spec/asset-catalogue S1), from an
 * EXHAUSTIVE map over every key of the generated AssetCatalogueItemFilterInput:
 * a key maps to its control, or `null` where it is not offered. The map's key
 * order is the toolbar's order.
 *
 * Built once per list mount (a stable array, so FilterBar never remounts a
 * chip); the two option lists are ACCESSORS read at render, so the category
 * and type choices fill in when their reads land and the type choices follow
 * the chosen category.
 */
export const catalogueFilters = (options: {
  categories: () => readonly Named[];
  types: () => readonly TypeOption[];
}): Filter<CatalogueFilter>[] =>
  constructFilters<CatalogueFilter>({
    categoryId: {
      label: () => t('label.category'),
      render: props => (
        <FilterSelect
          label={t('label.category')}
          testId={props.testId}
          value={props.filter().categoryId?.equalTo ?? ''}
          options={[
            { value: '', label: t('label.any') },
            ...options.categories().map(c => ({ value: c.id, label: c.name })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              categoryId: value ? { equalTo: value } : null,
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
          options={[
            { value: '', label: t('label.any') },
            ...typesFor(
              options.types(),
              props.filter().categoryId?.equalTo
            ).map(type => ({ value: type.id, label: type.name })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              typeId: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    code: {
      label: () => t('label.code'),
      render: props => (
        <FilterTextInput
          label={t('label.code')}
          testId={props.testId}
          value={props.filter().code?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({ code: value ? { like: value } : null })
          }
        />
      ),
    },
    manufacturer: {
      label: () => t('label.manufacturer'),
      render: props => (
        <FilterTextInput
          label={t('label.manufacturer')}
          testId={props.testId}
          value={props.filter().manufacturer?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              manufacturer: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    model: {
      label: () => t('label.model'),
      render: props => (
        <FilterTextInput
          label={t('label.model')}
          testId={props.testId}
          value={props.filter().model?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({ model: value ? { like: value } : null })
          }
        />
      ),
    },
    subCatalogue: {
      label: () => t('label.sub-catalogue'),
      render: props => (
        <FilterTextInput
          label={t('label.sub-catalogue')}
          testId={props.testId}
          value={props.filter().subCatalogue?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              subCatalogue: value ? { like: value } : null,
            })
          }
        />
      ),
    },

    // ─ not offered: identity, the name matches (the ids above cover them),
    // the class (one ships), and the equipment pick's search.
    id: null,
    category: null,
    class: null,
    classId: null,
    type: null,
    search: null,
  });
