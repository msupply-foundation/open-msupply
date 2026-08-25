import { createMemo, createResource, type Component } from 'solid-js';
import { FormRowItem } from '@/ui/layout/Form/FormRowItem';
import { t } from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
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
import {
  prescriptionOrderDateInstant,
  type UpdateInput,
} from './prescriptionOrderUpdate';
import {
  OrderDiagnosesActive,
  type PrescriptionOrderFieldsFragment,
  type OrderDiagnosesActiveResult,
} from './prescriptionOrderDetail.generated';

// The detail header's field cluster (spec/prescription-orders/ui-surface.md
// S3 § header toolbar), rendered as the children of the page's
// <HeaderToolbar>: Patient · Clinician · Date · Program · Diagnosis, then the
// scope's prominent custom fields. Weighted shares follow the dispensing
// toolbar's measured layout (person-name fields take the biggest shares; the
// date is pinned at its 9rem format width). Every field is read-only past New
// (AC-N5); unlike dispensing, a date or program change never touches lines —
// the order's lines carry no stock, so nothing needs clearing.

type Diagnosis = OrderDiagnosesActiveResult['diagnosesActive'][number];

export interface PrescriptionOrderToolbarProps {
  storeId: string;
  node: PrescriptionOrderFieldsFragment;
  disabled: boolean;
  onSave: (input: Omit<UpdateInput, 'id'>) => void;
  /** The picker's edit-patient affordance — opens the patient edit modal in
   *  place over this screen; routing is the page's concern. */
  onEditPatient: (patientId: string) => void;
}

export const PrescriptionOrderToolbar: Component<
  PrescriptionOrderToolbarProps
> = props => {
  // A MEMO, not a getter: it MINTS an option object, so a getter would hand a
  // new identity to the picker on every read (kdd/solid-reactivity-pitfalls
  // §14).
  const patientOption = createMemo((): PatientOption | undefined => {
    const patient = props.node.patient;
    return patient ? minimalPatientOption(patient.id, patient.name) : undefined;
  });

  const shownDay = () =>
    utcToLocalParts(props.node.prescriptionDatetime)?.date ?? null;

  // The active diagnoses the picker offers (the same consumed read
  // dispensing's side panel uses). Read non-suspending: this toolbar lives
  // under the already-open detail.
  const [diagnoses] = createResource(async () => {
    const result = await graphqlFetch(OrderDiagnosesActive, {});
    return result.kind === 'success' ? result.data.diagnosesActive : undefined;
  });

  return (
    <>
      <FormRowItem weight={1.9} minWidth="11rem">
        <PatientSearch
          label={t('label.patient')}
          size="small"
          storeId={props.storeId}
          selected={patientOption()}
          disabled={props.disabled}
          // An order always HAS a patient: never cleared, only swapped
          // (ui-standards/controls § clearability follows optionality).
          clearable={false}
          onEditPatient={props.onEditPatient}
          onSelect={patient =>
            patient && props.onSave({ patientId: patient.id })
          }
        />
      </FormRowItem>
      <FormRowItem weight={1.55}>
        <ClinicianSelect
          label={t('label.clinician')}
          size="small"
          inputTestId="clinician-select"
          allowCreate
          storeId={props.storeId}
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
          testId="date-field"
          value={shownDay()}
          max={localTodayIso()}
          disabled={props.disabled}
          onChange={day => {
            if (!day || day === shownDay()) return;
            props.onSave({
              prescriptionDatetime: prescriptionOrderDateInstant(day),
            });
          }}
        />
      </FormRowItem>
      <FormRowItem weight={1.2}>
        <ProgramNameSelect
          label={t('label.program')}
          size="small"
          testId="program-select"
          value={props.node.programId ?? undefined}
          disabled={props.disabled}
          onChange={programId =>
            props.onSave({ programId: { value: programId ?? null } })
          }
        />
      </FormRowItem>
      <FormRowItem weight={1.2}>
        <Combobox<Diagnosis>
          label={t('heading.diagnosis')}
          size="small"
          inputTestId="diagnosis-select"
          items={gated(diagnoses) ?? []}
          loading={diagnoses.loading}
          itemToString={d => d.description}
          itemToValue={d => d.id}
          value={props.node.diagnosisId ?? undefined}
          disabled={props.disabled}
          clearable
          onChange={diagnosis =>
            props.onSave({ diagnosisId: { value: diagnosis?.id ?? null } })
          }
        />
      </FormRowItem>
      {/* Prominent custom fields — save-on-change, the prescription_order
          scope (rules § custom fields; AC-F1). */}
      <CustomFieldsToolbar
        scope="prescription_order"
        recordId={props.node.id}
        values={props.node.customFields}
        disabled={props.disabled}
        layout="field"
        onSave={patch => props.onSave({ customFields: patch })}
      />
    </>
  );
};
