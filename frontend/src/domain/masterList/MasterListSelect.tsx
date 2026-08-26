import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import type { FocusTarget } from '../../ui/utils/createFocusTarget';
import { masterListsResource, type MasterList } from './masterListResource';

export interface MasterListSelectProps {
  /** Selected master-list id (undefined = none). */
  value?: string;
  /** Fires with the chosen master-list id, or null when cleared. */
  onChange: (masterListId: string | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** Max-width cap — forwarded to the Combobox, opt-in (default `full`). */
  width?: 'compact' | 'short' | 'long' | 'full';
  /**
   * A `createFocusTarget()` handle bound to the picker's input — for an owner
   * that focuses it after an action (e.g. a dialog opening on it).
   */
  focusTarget?: FocusTarget;
}

/*
 * The reusable Master-list picker — a Combobox pre-wired to the store-scoped
 * master-lists resource. A domain widget (src/domain): knows the data,
 * composed from the pure ui/ Combobox. Call sites pass value + onChange; it
 * owns items/label/value/loading. Reports only the id.
 */
export const MasterListSelect = (props: MasterListSelectProps): JSX.Element => (
  <Combobox<MasterList>
    label={props.label}
    hideLabel={props.hideLabel}
    items={masterListsResource.noSuspense()}
    loading={masterListsResource.loading()}
    itemToString={m => m.name}
    itemToValue={m => m.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    width={props.width}
    focusTarget={props.focusTarget}
    onChange={m => props.onChange(m?.id ?? null)}
  />
);
