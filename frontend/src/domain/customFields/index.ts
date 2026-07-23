// The shared custom-fields domain module (spec/ui-standards/custom-fields): the
// deployment-configurable fields a site attaches to its records. One scoped
// definitions read, the value-type logic, and the surfaces that render them —
// the read-only view, the editable tab, and the prominent-field toolbar —
// reused identically across every scope (item, customer, supplier, patient,
// invoice kinds).
export { CustomFieldsView } from './CustomFieldsView';
export { CustomFieldsEditTab } from './CustomFieldsEditTab';
export { CustomFieldsToolbar } from './CustomFieldsToolbar';
export { CustomFieldInput } from './CustomFieldInput';
export { CustomFieldOptionSelect } from './CustomFieldOptionSelect';
export {
  customFieldDefinitions,
  type CustomFieldDefinitionsReader,
} from './customFieldsResource';
export {
  parseCustomFields,
  customFieldValue,
  customFieldDisplay,
  resolveOptionName,
  orderOptionsHierarchically,
  shownCustomFields,
  partitionCustomFields,
  buildDynamicFilter,
  type CustomFieldDef,
  type CustomFieldOption,
  type CustomFieldDisplay,
  type OrderedOption,
  type PartitionedCustomFields,
  type DynamicFilterAst,
} from './customFields';
