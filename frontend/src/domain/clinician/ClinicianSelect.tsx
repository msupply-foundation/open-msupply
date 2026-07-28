import type { JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import {
  cliniciansResource,
  clinicianName,
  type Clinician,
} from './clinicianResource';

export interface ClinicianSelectProps {
  /** The selected clinician's id (undefined = none). */
  value?: string;
  /** Fires with the chosen clinician, or null when cleared. */
  onChange: (clinician: Clinician | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  /** Control size — `small` for a header field cluster's compact row. */
  size?: 'default' | 'small';
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** `data-testid` for the input — forwarded to the Combobox. */
  inputTestId?: string;
}

/*
 * The reusable clinician picker — a Combobox pre-wired to the store-scoped
 * clinician resource (active clinicians, displayed "Last, First"). A domain
 * widget (src/domain), consumed by the prescriptions create modal and detail
 * toolbar; clearable because a prescription's clinician is optional
 * (spec/prescriptions AC-N2).
 */
export const ClinicianSelect = (props: ClinicianSelectProps): JSX.Element => (
  <Combobox<Clinician>
    label={props.label}
    hideLabel={props.hideLabel}
    size={props.size}
    items={cliniciansResource.noSuspense()}
    loading={cliniciansResource.loading()}
    itemToString={clinicianName}
    itemToValue={clinician => clinician.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    inputTestId={props.inputTestId}
    onChange={clinician => props.onChange(clinician)}
  />
);
