import {
  LocaleKey,
  PropertyDisplayModeV2Input,
  PropertyNodeDisplayModeV2,
} from '@openmsupply-client/common';

export interface PropertyScopeDef {
  /** The `property_table_v2.table_name` value for this scope. */
  tableName: string;
  labelKey: LocaleKey;
  /**
   * Whether `PROMINENT` has a destination on this scope. Today only invoice
   * scopes have a primary surface (the detail-view toolbar) to promote to;
   * record scopes (name/item/patient) don't yet, so Prominent is offered only
   * where it does something.
   */
  supportsProminent: boolean;
}

/**
 * The scopes a property can be associated with, in display order. Mirrors the
 * server-side `PROPERTY_SCOPE_TABLE_NAMES` whitelist.
 */
export const PROPERTY_SCOPES: PropertyScopeDef[] = [
  {
    tableName: 'inbound_shipment',
    labelKey: 'label.inbound-shipment',
    supportsProminent: true,
  },
  {
    tableName: 'outbound_shipment',
    labelKey: 'label.outbound-shipment',
    supportsProminent: true,
  },
  {
    tableName: 'prescription',
    labelKey: 'label.prescription',
    supportsProminent: true,
  },
  {
    tableName: 'supplier_return',
    labelKey: 'label.supplier-return',
    supportsProminent: true,
  },
  {
    tableName: 'customer_return',
    labelKey: 'label.customer-return',
    supportsProminent: true,
  },
  { tableName: 'name', labelKey: 'label.facilities', supportsProminent: false },
  { tableName: 'item', labelKey: 'label.items', supportsProminent: false },
  {
    tableName: 'patient',
    labelKey: 'label.patients',
    supportsProminent: false,
  },
];

/** Map the query's output display-mode enum onto the mutation's input enum. */
export const toInputMode = (
  mode: PropertyNodeDisplayModeV2
): PropertyDisplayModeV2Input => {
  switch (mode) {
    case PropertyNodeDisplayModeV2.Hidden:
      return PropertyDisplayModeV2Input.Hidden;
    case PropertyNodeDisplayModeV2.Prominent:
      return PropertyDisplayModeV2Input.Prominent;
    // VISIBLE, plus OTHER (an unknown future mode) shown as Visible.
    default:
      return PropertyDisplayModeV2Input.Visible;
  }
};

/** Human-readable value type, e.g. `OPTION` -> `Option`. */
export const formatValueType = (valueType: string): string =>
  valueType.charAt(0) + valueType.slice(1).toLowerCase();
