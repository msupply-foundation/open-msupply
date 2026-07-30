import { createMemo, createSignal, Show, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { FormRowItem } from '@/ui/layout/Form/FormRowItem';
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
// FormRow lays them out as WEIGHTED shares that wrap as a unit
// (ui/docs/PAGES.md § header field cluster).
//
// The weights (#782, ux-testing/header-field-width.html "weighted columns"):
// a field's column is sized by its data, never by its count
// (spec/ui-standards/layout.md). Patient and Clinician hold person names —
// "MOHAMED, DJIBRIL ABDULLAHI" is 26 characters — so they take the biggest
// shares; the date is a fixed format that can never use more than its 9rem, so
// it's pinned (weight 0) instead of claiming a sixth of the strip; Program sits
// between. The 9rem is measured against the format, not guessed: 9rem leaves
// 95px of value room, and DateField's default `dd MMM yyyy` renders 74px in
// English, 77px in French ("30 juil. 2026") and 80px in Arabic ("٣٠ سبتمبر
// ٢٠٢٦" — no abbreviation exists), the widest shipped locale. A caller
// configuring a long-month format would need a wider floor. The prominent
// custom fields carry their own narrower share (CustomFieldsToolbar's `field`
// layout).
//
// The FLOORS are chosen so this row's total is no larger than the unweighted
// row's was (11 + 10 + 9 + 10 + 9.5 + 9.5 = 59rem against 6 × 10rem), because a
// bigger total would wrap the cluster to two lines on a ~1366px laptop where it
// fits on one today — and this header must not grow by a pixel. Measured on the
// six-field reference store: the patient field's value room goes 45 → 87px at
// that width, 57 → 127px at 1440px, and the full 26-character name fits from
// ~1680px up (it never fitted before). The two option fields give up 89 → 66px,
// which is the trade the standard asks for; the rest of what the name needs is
// the picker's own ~90px of icon chrome — the prototype's Lever 1 ("lean
// picker"), a separate follow-up against the shared Combobox, not this change.
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
  const navigate = useNavigate();
  // A pending date/program change awaiting the clear-lines confirmation.
  const [pending, setPending] = createSignal<Omit<UpdateInput, 'id'>>();

  const hasLines = () => props.node.lines.totalCount > 0;

  // A MEMO, not a getter: it MINTS an option object, so a getter would hand a
  // new identity to the picker on every read and invalidate everything
  // downstream that keys off it — including the combobox's own selection sync.
  const patientOption = createMemo((): PatientOption | undefined => {
    const patient = props.node.patient;
    return patient ? minimalPatientOption(patient.id, patient.name) : undefined;
  });

  // The shown day: the prescription date's LOCAL calendar day.
  const shownDay = () =>
    utcToLocalParts(prescriptionDateOf(props.node))?.date ?? null;

  const applyOrConfirm = (input: Omit<UpdateInput, 'id'>) => {
    if (hasLines()) setPending(input);
    else props.onSave(input);
  };

  return (
    <>
      <FormRowItem weight={1.9} minWidth="11rem">
        <PatientSearch
          label={t('label.patient')}
          size="small"
          width="full"
          storeId={props.storeId}
          selected={patientOption()}
          disabled={props.disabled}
          // No clear affordance: a prescription always HAS a patient, so the
          // field is never nullable — it is changed by picking another, never
          // emptied (ui-standards/controls § clearability follows optionality,
          // D5; the current app's patient input is likewise not clearable).
          clearable={false}
          // The picker's edit-patient affordance (spec/patients S4 allow-edit),
          // available whatever the prescription's own editability — it edits the
          // patient, not the prescription (ui-surface S3 § header fields). It
          // opens the patient's own screen, which holds the details form and the
          // Insurance tab; S4's two-tab edit modal is not built.
          onEditPatient={patientId =>
            navigate(`/${props.storeId}/dispensary/patients/${patientId}`)
          }
          // A prescription always has a patient: the picker never clears
          // (null selections are ignored), it only swaps (AC-N1).
          onSelect={patient =>
            patient && props.onSave({ patientId: patient.id })
          }
        />
      </FormRowItem>
      {/* Clinician and Program keep the row's own 10rem floor. */}
      <FormRowItem weight={1.55}>
        <ClinicianSelect
          label={t('label.clinician')}
          size="small"
          width="full"
          inputTestId="clinician-select"
          value={props.node.clinicianId ?? undefined}
          disabled={props.disabled}
          onChange={clinician =>
            props.onSave({ clinicianId: { value: clinician?.id ?? null } })
          }
        />
      </FormRowItem>
      <FormRowItem weight={0} minWidth="9rem">
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
      </FormRowItem>
      <FormRowItem weight={1.2}>
        <ProgramNameSelect
          label={t('label.program')}
          size="small"
          width="full"
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
      </FormRowItem>
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
