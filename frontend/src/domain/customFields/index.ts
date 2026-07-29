// The shared custom-fields domain module (spec/ui-standards/custom-fields): the
// deployment-configurable fields a site attaches to its records. A bounded
// in-house interpreter (kdd/report-argument-forms) — one pure parser
// normalising the closed value-type vocabulary into a discriminated union, and
// one explicit Switch per render surface (view / input / filter) — reused
// identically across every scope (item, customer, supplier, patient, invoice
// kinds). domain imports api + ui; ui imports neither (kdd/domain-modules).

// Surfaces
export { CustomFieldsView } from './CustomFieldsView';
export { CustomFieldsEditTab } from './CustomFieldsEditTab';
export { CustomFieldsToolbar } from './CustomFieldsToolbar';
export { CustomFieldInput } from './CustomFieldInput';
export { CustomFieldOptionSelect } from './CustomFieldOptionSelect';
export { CustomFieldFilterControl } from './CustomFieldFilterControl';

// List integration
export { customFieldColumns } from './customFieldColumns';
export {
  customFieldFilters,
  type CustomFieldFilterState,
} from './customFieldFilters';

// Definitions read (scope-keyed, non-suspending cache)
export {
  customFieldDefinitions,
  type CustomFieldDefinitionsReader,
} from './customFieldsResource';

// Parser + pure helpers
export {
  parseCustomField,
  parseCustomFields,
  customFieldValue,
  shownCustomFields,
  partitionCustomFields,
  orderOptionsHierarchically,
  optionAndDescendantIds,
  ancestorIds,
  resolveOptionName,
  type CustomFieldDef,
  type CustomFieldOption,
  type ParsedCustomField,
  type OrderedOption,
  type PartitionedCustomFields,
} from './parse';

// Filter logic
export {
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterValue,
} from './filter';

// Display — EMPTY_FIELD_VALUE is the app-wide empty marker for a read-only
// FIELD (spec D67: beside a label, blank reads as a rendering fault), so it is
// shared with the read-only detail forms, not just the custom-field surfaces.
export { customFieldDisplayString, EMPTY_FIELD_VALUE } from './display';
