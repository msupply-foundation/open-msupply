import { graphqlFetch } from '../../api/graphql';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';
import {
  InvoiceCustomFields,
  type InvoiceCustomFieldsResult,
} from './invoiceCustomFields.generated';

// One invoice custom-field definition (spec/prescriptions § custom fields):
// the label, value type, prominence, and OPTION hierarchy that make a
// customFields value renderable. The value blob itself lives on the invoice.
export type CustomFieldDefinition =
  InvoiceCustomFieldsResult['customFields']['nodes'][number];

export type CustomFieldDisplayMode = CustomFieldDefinition['displayMode'];
export type CustomFieldValueType = CustomFieldDefinition['valueType'];

/**
 * A store-scoped cache of one invoice type's custom-field definitions. The
 * definitions are global config (the query takes only a `scope` string, no
 * storeId), but keying on the store still re-fetches on a store switch —
 * cheap, and reuses the one resource helper. Read via `.noSuspense()`; an
 * empty list is the common case on stores with no configured properties.
 */
export const createInvoiceCustomFieldsResource = (scope: string) =>
  createStoreScopedResource<CustomFieldDefinition>(currentStoreId, async () => {
    const result = await graphqlFetch(InvoiceCustomFields, { scope });
    return result.kind === 'success'
      ? result.data.customFields.nodes
      : undefined;
  });

// The prescription scope's definitions (`custom_field_scope.scope`), shared by
// the detail toolbar (prominent), the Custom fields tab (visible), and the
// list columns/filters.
export const prescriptionCustomFieldsResource =
  createInvoiceCustomFieldsResource('prescription');

/** Prominent fields render on the record's primary surface (the toolbar). */
export const isProminent = (d: CustomFieldDefinition): boolean =>
  d.displayMode === 'PROMINENT';

/** Visible (non-prominent, non-hidden) fields render in the Custom fields tab. */
export const isTabVisible = (d: CustomFieldDefinition): boolean =>
  d.displayMode === 'VISIBLE' || d.displayMode === 'OTHER';
