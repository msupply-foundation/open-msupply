import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import {
  shippingMethodsResource,
  type ShippingMethod,
} from './shippingMethodResource';

export interface ShippingMethodSelectProps {
  /** Selected shipping-method id (undefined = none). */
  value?: string;
  onChange: (method: ShippingMethod | null) => void;
  label: string;
  hideLabel?: boolean;
  /** Control size — 'small' for dense contexts (a side-panel field row). */
  size?: 'default' | 'small';
  disabled?: boolean;
  placeholder?: string;
}

/*
 * The shipping-method lookup (spec/ui-standards/components.md §
 * shipping-method lookup) — a Combobox over the store-scoped cache.
 */
export const ShippingMethodSelect = (
  props: ShippingMethodSelectProps
): JSX.Element => (
  <Combobox<ShippingMethod>
    label={props.label}
    hideLabel={props.hideLabel}
    size={props.size}
    items={shippingMethodsResource.noSuspense()}
    loading={shippingMethodsResource.loading()}
    itemToString={m => m.method}
    itemToValue={m => m.id}
    value={props.value}
    disabled={props.disabled}
    placeholder={props.placeholder}
    onChange={m => props.onChange(m)}
  />
);
