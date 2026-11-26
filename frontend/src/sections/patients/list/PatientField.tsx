import {
  createEffect,
  createSignal,
  on,
  Show,
  untrack,
  type JSX,
} from 'solid-js';
import { t } from '../../../intl';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { CloseIcon, EditIcon } from '../../../ui/icons';
import { PickerField } from '../../../ui/elements/selectors/PickerField';
import type { FocusTarget } from '../../../ui/utils/createFocusTarget';
import { ChoosePatient } from './ChoosePatient';

// A record's patient (#631 spike; spec/patients S4): a picker box showing the
// name, which opens the patient search to choose another, never a type-ahead.
// A record's patient is only ever swapped, never cleared; a surface that
// isn't a record yet (the Simple screen's who it's for) can pass `onClear`.

export interface PatientFieldProps {
  storeId: string;
  label?: string;
  /** Leaves the label out, for a row that labels the field itself. */
  hideLabel?: boolean;
  /** The empty field's prompt, where the screen needs its own. */
  placeholder?: string;
  size?: 'small';
  patient: { id: string; name: string } | undefined;
  /** Disables choosing another patient. */
  disabled?: boolean;
  /** Edit the patient's details; the pencil shows when given. */
  onEditPatient?: (patientId: string) => void;
  /** Another patient was chosen; not called when the same one is chosen. */
  onChange: (patient: { id: string; name: string }) => void;
  /**
   * Empties the field; the clear button shows when given, while it holds a
   * patient and isn't disabled, in the pencil's place. Not for a record's
   * patient, which is never cleared.
   */
  onClear?: () => void;
  /** The create form's save button, when a new patient is made here. */
  saveLabel?: string;
  /**
   * Opens the search each time this turns true while there's no patient yet:
   * the open state of a dialog holding the field, whose content stays
   * mounted while it's closed. Turning false closes the search.
   */
  chooseOnOpen?: boolean;
  testId?: string;
  focusTarget?: FocusTarget;
}

export const PatientField = (props: PatientFieldProps): JSX.Element => {
  const [choosing, setChoosing] = createSignal(false);
  createEffect(
    on(
      () => props.chooseOnOpen === true,
      open => setChoosing(open && !untrack(() => props.patient))
    )
  );

  return (
    <>
      {/* Picked in the patient search, not typed: a big register needs the
          search's fields, other facilities and the duplicate check. */}
      <PickerField
        label={props.label ?? t('label.patient')}
        hideLabel={props.hideLabel}
        size={props.size}
        value={props.patient?.name}
        placeholder={props.placeholder ?? t('placeholder.search-patient')}
        disabled={props.disabled}
        testId={props.testId}
        focusTarget={props.focusTarget}
        onOpen={() => setChoosing(true)}
        endAction={
          props.onClear ? (
            <Show when={props.patient && !props.disabled}>
              <IconButton
                icon={<CloseIcon />}
                label={t('common.clear')}
                data-testid={`${props.testId ?? 'patient-field'}-clear`}
                onClick={() => props.onClear?.()}
              />
            </Show>
          ) : (
            // Edits the patient, not the record, so it ignores the record's
            // own editability (spec/patients S4 allow-edit).
            <Show when={props.onEditPatient && props.patient}>
              {patient => (
                <IconButton
                  icon={<EditIcon />}
                  label={t('label.edit')}
                  data-testid="edit-patient-button"
                  onClick={() => props.onEditPatient?.(patient().id)}
                />
              )}
            </Show>
          )
        }
      />
      <ChoosePatient
        open={choosing()}
        storeId={props.storeId}
        title={props.patient ? t('label.change') : t('label.patient')}
        saveLabel={props.saveLabel}
        showRecent
        changingFrom={props.patient?.name}
        onClose={() => setChoosing(false)}
        onChosen={patient => {
          setChoosing(false);
          if (patient.id !== props.patient?.id) props.onChange(patient);
        }}
      />
    </>
  );
};
