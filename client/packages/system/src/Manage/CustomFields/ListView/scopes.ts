import { LocaleKey } from '@openmsupply-client/common';

/**
 * The custom-field scopes, in tab order. These strings must match the
 * `custom_field_scope.scope` values on the server (see
 * `service/src/sync/central_mapping_custom_fields.rs`).
 *
 * `supportsProminent` marks the scopes that actually render a prominent
 * surface (the invoice detail-view toolbar). The Prominent column is only
 * shown for those; the others (item / names) have no place to promote a field
 * to yet, so the column is hidden.
 */
export const CUSTOM_FIELD_SCOPES: {
  scope: string;
  labelKey: LocaleKey;
  supportsProminent: boolean;
}[] = [
  { scope: 'item', labelKey: 'label.custom-field-scope-item', supportsProminent: false },
  {
    scope: 'customer',
    labelKey: 'label.custom-field-scope-customer',
    supportsProminent: false,
  },
  {
    scope: 'supplier',
    labelKey: 'label.custom-field-scope-supplier',
    supportsProminent: false,
  },
  {
    scope: 'patient',
    labelKey: 'label.custom-field-scope-patient',
    supportsProminent: false,
  },
  {
    scope: 'inbound_shipment',
    labelKey: 'label.custom-field-scope-inbound-shipment',
    supportsProminent: true,
  },
  {
    scope: 'outbound_shipment',
    labelKey: 'label.custom-field-scope-outbound-shipment',
    supportsProminent: true,
  },
  {
    scope: 'prescription',
    labelKey: 'label.custom-field-scope-prescription',
    supportsProminent: true,
  },
  {
    scope: 'supplier_return',
    labelKey: 'label.custom-field-scope-supplier-return',
    supportsProminent: true,
  },
  {
    scope: 'customer_return',
    labelKey: 'label.custom-field-scope-customer-return',
    supportsProminent: true,
  },
];

export const scopeSupportsProminent = (scope: string): boolean =>
  CUSTOM_FIELD_SCOPES.find(s => s.scope === scope)?.supportsProminent ?? false;
