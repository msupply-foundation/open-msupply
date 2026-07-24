import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
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
import { utcToLocalParts } from '../../../ui/elements/inputs/dateTimeConvert';
import { prescriptionDateOf } from '../prescriptionStatus';
import {
  prescriptionDateInstant,
  type UpdateInput,
} from './prescriptionUpdate';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

// The detail toolbar (spec/prescriptions/ui-surface.md S3 § header fields):
// Patient (the reusable picker — changeable in place, identity kept, never
// cleared: AC-N1/N3-adjacent), Clinician (clearable, AC-N2), Date (the
// prescription date, capped at today — AC-B5), Program. A date or program
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
  const today = () => {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  };

  const applyOrConfirm = (input: Omit<UpdateInput, 'id'>) => {
    if (hasLines()) setPending(input);
    else props.onSave(input);
  };

  return (
    <>
      <FieldRow label={t('label.patient')}>
        <PatientSearch
          label={t('label.patient')}
          hideLabel
          storeId={props.storeId}
          selected={patientOption()}
          disabled={props.disabled}
          // A prescription always has a patient: the picker never clears
          // (null selections are ignored), it only swaps (AC-N1).
          onSelect={patient =>
            patient && props.onSave({ patientId: patient.id })
          }
        />
      </FieldRow>
      <FieldRow label={t('label.clinician')}>
        <ClinicianSelect
          label={t('label.clinician')}
          hideLabel
          value={props.node.clinicianId ?? undefined}
          disabled={props.disabled}
          onChange={clinician =>
            props.onSave({ clinicianId: { value: clinician?.id ?? null } })
          }
        />
      </FieldRow>
      <FieldRow label={t('label.date')}>
        <DateField
          label={t('label.date')}
          hideLabel
          value={shownDay()}
          max={today()}
          disabled={props.disabled}
          onChange={day => {
            if (!day || day === shownDay()) return;
            applyOrConfirm({ prescriptionDate: prescriptionDateInstant(day) });
          }}
        />
      </FieldRow>
      <FieldRow label={t('label.program')}>
        <ProgramNameSelect
          label={t('label.program')}
          hideLabel
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
      </FieldRow>
      {/* Prominent custom fields (AC-CF1) — inline, save-on-change. */}
      <CustomFieldsToolbar
        scope="prescription"
        recordId={props.node.id}
        values={props.node.customFields}
        disabled={props.disabled}
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
