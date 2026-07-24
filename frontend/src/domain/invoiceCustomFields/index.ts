// The shared invoice custom-fields (properties v2) module
// (spec/prescriptions § custom fields): the scope-keyed definitions resource,
// the per-value-type input control, and the list property columns. Consumed by
// prescriptions today; every invoice type has its own scope.
export {
  createInvoiceCustomFieldsResource,
  prescriptionCustomFieldsResource,
  isProminent,
  isTabVisible,
  type CustomFieldDefinition,
  type CustomFieldDisplayMode,
  type CustomFieldValueType,
} from './invoiceCustomFieldsResource';
export {
  CustomFieldInput,
  type CustomFieldInputProps,
} from './CustomFieldInput';
export { buildCustomFieldColumns } from './customFieldColumns';
