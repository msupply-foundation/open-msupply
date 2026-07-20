import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { locationsResource, type Location } from './locationResource';

export interface LocationSelectProps {
  /** Selected location id (undefined = none). */
  value?: string;
  /**
   * Fires with the chosen location (the full node so callers can store
   * code/name), or null.
   */
  onChange: (location: Location | null) => void;
  /** Field label (required for a11y). */
  label: string;
  /**
   * Hide the label visually (kept for a11y) — for use inside a FieldRow that
   * shows it.
   */
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/*
 * The reusable Location picker — a Combobox pre-wired to the store-scoped
 * locations resource. A domain widget (src/domain): it knows the app's data
 * (fetches + labels locations) but is composed from the pure ui/ Combobox.
 * Call sites just pass value + onChange instead of re-wiring
 * items/itemToString/itemToValue/loading each time (and so the label format
 * stays consistent). Reports the full Location node (id + code + name) so
 * callers can store the code/name for display without a re-lookup; id-only
 * callers just read `.id`.
 */
export const LocationSelect = (props: LocationSelectProps): JSX.Element => (
  <Combobox<Location>
    label={props.label}
    hideLabel={props.hideLabel}
    items={locationsResource.noSuspense()}
    loading={locationsResource.loading()}
    itemToString={l => l.code}
    itemToValue={l => l.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    onChange={l => props.onChange(l)}
  />
);
