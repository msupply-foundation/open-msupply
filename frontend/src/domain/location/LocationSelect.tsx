import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import type { FocusTarget } from '../../ui/utils/createFocusTarget';
import { type Location } from './locationResource';

export interface LocationSelectProps {
  /**
   * The locations to choose from, fetched by the parent route/view and passed
   * in (this domain widget owns no cache). See the module comment.
   */
  locations: Location[];
  /** True while the parent's fetch is in flight. */
  loading?: boolean;
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
  /**
   * A `createFocusTarget()` handle bound to the picker's input — for an owner
   * that focuses it after an action (e.g. a dialog opening on it).
   */
  focusTarget?: FocusTarget;
  /** `data-testid` for the text input (locale-stable test hook, e2e/TESTIDS.md). */
  inputTestId?: string;
}

/*
 * The reusable **volume-blind** Location picker — a Combobox labelled by a
 * location's "code — name", used where a location is merely *referenced*
 * (scoping a stocktake count, a list filter) so capacity is irrelevant. For
 * surfaces that *associate stock* with a location — the stocktake / inbound line
 * editors, bulk change-location — use LocationVolumeSelect instead, which shows
 * each option's % used and offers the fullness filter.
 *
 * A domain widget (src/domain): it knows the app's data shape (labels locations
 * by code) but is composed from the pure ui/ Combobox, and — per
 * spec/ui-standards/components.md — owns NO cache: the parent fetches the list
 * (fetchLocations) and passes it in, so there is one obvious fetch per view
 * rather than a hidden global. Reports the full Location node (id + code + name)
 * so callers can store the code/name for display without a re-lookup.
 */
export const LocationSelect = (props: LocationSelectProps): JSX.Element => (
  <Combobox<Location>
    label={props.label}
    hideLabel={props.hideLabel}
    items={props.locations}
    loading={props.loading}
    itemToString={l => `${l.code} — ${l.name}`}
    itemToValue={l => l.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    focusTarget={props.focusTarget}
    inputTestId={props.inputTestId}
    onChange={l => props.onChange(l)}
    // Let the popup grow past a narrow field so a location's code + name stays
    // readable rather than truncating to the field width.
    matchTriggerWidth={false}
  />
);
