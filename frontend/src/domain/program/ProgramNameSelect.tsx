import type { JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { programsResource, type ProgramListItem } from './programResource';

export interface ProgramNameSelectProps {
  /** The selected program's id (undefined = none). */
  value?: string;
  /** Fires with the chosen program's own id, or null when cleared. */
  onChange: (programId: string | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  /** Control size — `small` for a header field cluster's compact row. */
  size?: 'default' | 'small';
  /** Width cap — `full` to fill the slot a layout hands it (header clusters). */
  width?: 'compact' | 'short' | 'long' | 'full';
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** `data-testid` for the input — forwarded to the Combobox. */
  testId?: string;
}

/*
 * The store's-programs picker — a Combobox over the store-scoped programs
 * resource, reporting a program's OWN id (ProgramNode.id). This is what a
 * prescription's programId references (spec/prescriptions § patient,
 * clinician, program, diagnosis). Distinct from ProgramDocumentSelect, which
 * picks a program-enrolment DOCUMENT registry and reports its context id.
 */
export const ProgramNameSelect = (
  props: ProgramNameSelectProps
): JSX.Element => (
  <Combobox<ProgramListItem>
    label={props.label}
    hideLabel={props.hideLabel}
    size={props.size}
    width={props.width}
    items={programsResource.noSuspense()}
    loading={programsResource.loading()}
    itemToString={program => program.name}
    itemToValue={program => program.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    inputTestId={props.testId}
    onChange={program => props.onChange(program?.id ?? null)}
  />
);
