import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { vvmStatusesResource, type VvmStatus } from './vvmStatusResource';

export interface VvmStatusSelectProps {
  /** Selected VVM-status id (undefined = none). */
  value?: string;
  /**
   * Fires with the chosen VVM status (the full node, so callers can store
   * code/description for display), or null.
   */
  onChange: (status: VvmStatus | null) => void;
  /** Field label (required for a11y). */
  label: string;
  /**
   * Hide the label visually (kept for a11y) — for use inside a FieldRow or a
   * table cell that supplies its own header.
   */
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** Control size — 'small' for dense contexts (a batch-grid cell). */
  size?: 'default' | 'small';
}

/*
 * The reusable VVM-status picker — a Combobox pre-wired to the store-scoped
 * activeVvmStatuses resource (spec/stocktakes › store-preference gates:
 * manageVvmStatusForStock). A domain widget (src/domain): it knows the app's
 * data (fetches + labels the statuses) but is composed from the pure ui/
 * Combobox. Reports the full VvmStatus node so callers can store code/
 * description without a re-lookup; id-only callers just read `.id`. Options are
 * already priority-ordered by the resource.
 */
export const VvmStatusSelect = (props: VvmStatusSelectProps): JSX.Element => (
  <Combobox<VvmStatus>
    label={props.label}
    hideLabel={props.hideLabel}
    items={vvmStatusesResource.noSuspense()}
    loading={vvmStatusesResource.loading()}
    itemToString={s => s.description}
    itemToValue={s => s.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    size={props.size}
    onChange={s => props.onChange(s)}
  />
);
