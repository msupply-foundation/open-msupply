import { exhaustiveCheck } from '../../typeHelpers';
import type { FilterField, FilterValues } from '../../components/ui/FilterBar';
import type { StocktakesVariables } from './stocktakes.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no remapping
// — this is the generated variables' filter shape).
export type StocktakeFilter = NonNullable<StocktakesVariables['filter']>;
type FilterKey = keyof StocktakeFilter;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the stocktakes list (the spec's
 * deliberate-filters requirement, preserved from the reference vertical while
 * targeting the library FilterBar). `fieldFor` is a switch over every key of the
 * generated StocktakeFilterInput with no default arm — exhaustiveCheck forces it
 * to be total. When the schema gains a filter, codegen adds the key, this switch
 * stops compiling, and we must decide: expose it (return a FilterField) or dismiss
 * it (return null). Nothing is exposed by accident.
 *
 * FilterBar speaks a flat value model (string / string[]); the GraphQL filter is
 * operator objects. The two mappers below bridge them — an empty/absent value
 * means "filter not applied".
 */
const fieldFor = (key: FilterKey): FilterField | null => {
  switch (key) {
    case 'status':
      return {
        key,
        name: 'Status',
        type: 'enum',
        options: [
          { value: 'NEW', label: 'New' },
          { value: 'FINALISED', label: 'Finalised' },
        ],
      };
    case 'description':
      return { key, name: 'Description', type: 'text', placeholder: 'contains…' };
    case 'comment':
      return { key, name: 'Comment', type: 'text', placeholder: 'contains…' };
    case 'isLocked':
      return {
        key,
        name: 'Locked',
        type: 'enum',
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ],
      };
    case 'isProgramStocktake':
      return {
        key,
        name: 'Program stocktake',
        type: 'enum',
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ],
      };

    // Date-range filter — the library FilterBar has no date field yet, so it is
    // deferred (a Date filter field is on the backlog); listed here so the switch
    // stays exhaustive and the decision is on record.
    case 'stocktakeDate':
    // Identity / relational filters — programmatic, not user-facing list filters.
    case 'id':
    case 'userId':
    case 'programId':
    case 'stocktakeNumber':
    case 'createdDatetime':
    case 'finalisedDatetime':
      return null;
  }
  // A new key on StocktakeFilterInput makes `key` non-never here and this stops
  // compiling — forcing a deliberate decision above.
  return exhaustiveCheck(key);
};

// User-facing filters, in display order (explicit so the toolbar reads deliberately).
const FIELD_ORDER: FilterKey[] = [
  'status',
  'description',
  'comment',
  'isLocked',
  'isProgramStocktake',
];

export const FILTER_FIELDS: FilterField[] = FIELD_ORDER.map(fieldFor).filter(
  (field): field is FilterField => field !== null,
);

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const asString = (value: string | string[] | undefined): string =>
  typeof value === 'string' ? value : '';

/** FilterBar's flat values → the GraphQL filter object. */
export const toStocktakeFilter = (values: FilterValues): StocktakeFilter => {
  const filter: StocktakeFilter = {};

  const status = asArray(values.status).filter(
    (s): s is 'NEW' | 'FINALISED' => s === 'NEW' || s === 'FINALISED',
  );
  if (status.length) filter.status = { equalAny: status };

  const description = asString(values.description);
  if (description) filter.description = { like: description };

  const comment = asString(values.comment);
  if (comment) filter.comment = { like: comment };

  // A single ticked value means true/false; nothing (or both) means no filter.
  const locked = asArray(values.isLocked);
  if (locked.length === 1) filter.isLocked = locked[0] === 'true';

  const program = asArray(values.isProgramStocktake);
  if (program.length === 1) filter.isProgramStocktake = program[0] === 'true';

  return filter;
};

/** The GraphQL filter object → FilterBar's flat values (to seed chips from the URL). */
export const toFilterValues = (filter: StocktakeFilter): FilterValues => {
  const values: FilterValues = {};
  if (filter.status?.equalAny?.length) values.status = filter.status.equalAny;
  if (filter.description?.like) values.description = filter.description.like;
  if (filter.comment?.like) values.comment = filter.comment.like;
  if (filter.isLocked != null) values.isLocked = [String(filter.isLocked)];
  if (filter.isProgramStocktake != null)
    values.isProgramStocktake = [String(filter.isProgramStocktake)];
  return values;
};
