import type { LocaleKey } from '../../intl';

// The ten custom-field SCOPES, in the fixed order the screen offers them
// (spec/custom-fields ui-surface S1 § scope tabs; rules § definitions are
// configuration).
//
// Hard-coded on purpose. `scope` is a free-form String on both the
// configuration read and the display read, and an unknown / mis-cased / empty
// value answers an EMPTY connector with no error — indistinguishable from a
// scope that genuinely has no fields (contract.md wire trap). So the vocabulary
// can never be composed, inferred, or taken from input: it is this list.
//
// `offersProminent` is a CLIENT narrowing, not a server rule (rules §
// placement): only the five invoice scopes have a primary surface to promote
// onto, so only they show the Prominent column. The server accepts PROMINENT on
// any scope; it simply has nowhere to render there and behaves as VISIBLE.

export interface CustomFieldScope {
  /** The wire value — one of the ten fixed scope strings. */
  value: string;
  /** Tab label; each scope renders its own key (ui-surface S1). */
  labelKey: LocaleKey;
  /** Whether this scope has a primary surface to promote a field onto. */
  offersProminent: boolean;
}

export const CUSTOM_FIELD_SCOPES: readonly CustomFieldScope[] = [
  {
    value: 'item',
    labelKey: 'label.custom-field-scope-item',
    offersProminent: false,
  },
  {
    value: 'customer',
    labelKey: 'label.custom-field-scope-customer',
    offersProminent: false,
  },
  {
    value: 'supplier',
    labelKey: 'label.custom-field-scope-supplier',
    offersProminent: false,
  },
  {
    value: 'patient',
    labelKey: 'label.custom-field-scope-patient',
    offersProminent: false,
  },
  {
    value: 'inbound_shipment',
    labelKey: 'label.custom-field-scope-inbound-shipment',
    offersProminent: true,
  },
  {
    value: 'outbound_shipment',
    labelKey: 'label.custom-field-scope-outbound-shipment',
    offersProminent: true,
  },
  {
    value: 'prescription',
    labelKey: 'label.custom-field-scope-prescription',
    offersProminent: true,
  },
  {
    // The prescriber-side request, distinct from the dispensing `prescription`
    // scope above. Its fields are shipped by open-mSupply itself rather than
    // configured per deployment (`service/src/custom_field/builtin.rs`), so
    // this tab is never empty — it is where a deployment hides or promotes
    // what it was given (rules § custom fields, AC-F3).
    value: 'prescription_request',
    labelKey: 'label.custom-field-scope-prescription-request',
    offersProminent: true,
  },
  {
    value: 'supplier_return',
    labelKey: 'label.custom-field-scope-supplier-return',
    offersProminent: true,
  },
  {
    value: 'customer_return',
    labelKey: 'label.custom-field-scope-customer-return',
    offersProminent: true,
  },
];

/** The scope selected on arrival — the first tab (ui-surface S1). */
export const DEFAULT_SCOPE = CUSTOM_FIELD_SCOPES[0].value;

/**
 * Whether the named scope offers promotion. An unknown scope offers none: it
 * cannot have a primary surface this build knows how to promote onto.
 */
export const scopeOffersProminent = (scope: string): boolean =>
  CUSTOM_FIELD_SCOPES.find(s => s.value === scope)?.offersProminent ?? false;
