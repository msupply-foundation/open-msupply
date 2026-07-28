import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import {
  PatientSearch,
  minimalPatientOption,
  type PatientOption,
} from '../../../domain/patient';
import { ClinicianSelect } from '../../../domain/clinician';
import { ProgramNameSelect } from '../../../domain/program';
import { CustomFieldsToolbar } from '../../../domain/customFields';
import {
  localTodayIso,
  utcToLocalParts,
} from '../../../ui/elements/inputs/dateTimeConvert';
import { prescriptionDateOf } from '../prescriptionStatus';
import {
  prescriptionDateInstant,
  type UpdateInput,
} from './prescriptionUpdate';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

// The detail header's field cluster (spec/prescriptions/ui-surface.md S3 §
// header fields), rendered as the children of the page's <HeaderToolbar>: each
// field carries its own label above a small control, and HeaderToolbar's
// FormRow gives them equal shares that wrap as a unit (ui/docs/PAGES.md §
// header field cluster).
//
// The fields: Patient (the reusable picker — changeable in place, identity
// kept, never cleared: AC-N1/N3-adjacent), Clinician (clearable, AC-N2), Date
// (the prescription date, capped at today — AC-B5), Program. A date or program
// change while lines exist warns that ALL lines will be removed, then clears
// them before applying (AC-B2 — the server only enforces the no-lines
// condition; the ordering is the client's).

export interface PrescriptionToolbarProps {
  storeId: string;
  node: PrescriptionFieldsFragment;
  disabled: boolean;
  /** A plain header save (no line implications). */
  onSave: (input: Omit<UpdateInput, 'id'>) => void;
  /** Delete ALL lines, then save (the AC-B2 flow). */
  onClearLinesAndSave: (input: Omit<UpdateInput, 'id'>) => void;
}

export const PrescriptionToolbar: Component<
  PrescriptionToolbarProps
> = props => {
  // A pending date/program change awaiting the clear-lines confirmation.
  const [pending, setPending] = createSignal<Omit<UpdateInput, 'id'>>();

  const hasLines = () => props.node.lines.totalCount > 0;

  const patientOption = (): PatientOption | undefined => {
    const patient = props.node.patient;
    return patient ? minimalPatientOption(patient.id, patient.name) : undefined;
  };

  // The shown day: the prescription date's LOCAL calendar day.
  const shownDay = () =>
    utcToLocalParts(prescriptionDateOf(props.node))?.date ?? null;

  const applyOrConfirm = (input: Omit<UpdateInput, 'id'>) => {
    if (hasLines()) setPending(input);
    else props.onSave(input);
  };

  return (
    <>
      <PatientSearch
        label={t('label.patient')}
        size="small"
        storeId={props.storeId}
        selected={patientOption()}
        disabled={props.disabled}
        // A prescription always has a patient: the picker never clears
        // (null selections are ignored), it only swaps (AC-N1).
        onSelect={patient => patient && props.onSave({ patientId: patient.id })}
      />
      <ClinicianSelect
        label={t('label.clinician')}
        size="small"
        inputTestId="clinician-select"
        value={props.node.clinicianId ?? undefined}
        disabled={props.disabled}
        onChange={clinician =>
          props.onSave({ clinicianId: { value: clinician?.id ?? null } })
        }
      />
      <DateField
        label={t('label.date')}
        size="small"
        width="full"
        testId="date-field"
        value={shownDay()}
        max={localTodayIso()}
        disabled={props.disabled}
        onChange={day => {
          if (!day || day === shownDay()) return;
          applyOrConfirm({ prescriptionDate: prescriptionDateInstant(day) });
        }}
      />
      <ProgramNameSelect
        label={t('label.program')}
        size="small"
        testId="program-select"
        value={props.node.programId ?? undefined}
        disabled={props.disabled}
        onChange={programId => {
          // Clearing the program keeps the lines (the catalogue only
          // widens); choosing a DIFFERENT program clears them (AC-B2).
          if (programId == null)
            return props.onSave({ programId: { value: null } });
          if (programId === props.node.programId) return;
          applyOrConfirm({ programId: { value: programId } });
        }}
      />
      {/* Prominent custom fields (AC-CF1) — save-on-change, wearing their own
          labels like the fields above (the cluster's `field` layout). */}
      <CustomFieldsToolbar
        scope="prescription"
        recordId={props.node.id}
        values={props.node.customFields}
        disabled={props.disabled}
        layout="field"
        onSave={patch => props.onSave({ customFields: patch })}
      />

      {/* The clear-lines warning (AC-B2): proceeding deletes every line, then
          applies the pending change; declining leaves everything untouched. */}
      <Show when={pending()}>
        {input => (
          <ConfirmDialog
            open
            onClose={() => setPending(undefined)}
            title={t('heading.are-you-sure')}
            message={t('messages.confirm-delete-prescription-lines')}
            confirmVariant="danger"
            onConfirm={() => {
              props.onClearLinesAndSave(input());
              setPending(undefined);
            }}
          />
        )}
      </Show>
    </>
  );
};
