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
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { UserLabel } from '../../../ui/elements/typography/UserLabel';
import { ProgramNameSelect } from '../../../domain/program';
import { CustomFieldsToolbar } from '../../../domain/customFields';
import {
  localTodayIso,
  utcToLocalParts,
} from '../../../ui/elements/inputs/dateTimeConvert';
import {
  prescriptionRequestDateInstant,
  type UpdateInput,
} from './prescriptionRequestUpdate';
import {
  RequestDiagnosesActive,
  type PrescriptionRequestFieldsFragment,
  type RequestDiagnosesActiveResult,
} from './prescriptionRequestDetail.generated';

// The detail header's field cluster (spec/prescription-requests/ui-surface.md
// S3 § header toolbar), rendered as the children of the page's
// <HeaderToolbar>: Patient · Date · Program · Diagnosis · Prescriber, then the
// scope's prominent custom fields. Weighted shares follow the dispensing
// toolbar's measured layout (person-name fields take the biggest shares; the
// date is pinned at its 9rem format width). Every field is read-only past New
// (AC-N5); unlike dispensing, a date or program change never touches lines —
// the request's lines carry no stock, so nothing needs clearing.

type Diagnosis = RequestDiagnosesActiveResult['diagnosesActive'][number];

export interface PrescriptionRequestToolbarProps {
  storeId: string;
  node: PrescriptionRequestFieldsFragment;
  disabled: boolean;
  onSave: (input: Omit<UpdateInput, 'id'>) => void;
  /** The picker's edit-patient affordance — opens the patient edit modal in
   *  place over this screen; routing is the page's concern. */
  onEditPatient: (patientId: string) => void;
}

export const PrescriptionRequestToolbar: Component<
  PrescriptionRequestToolbarProps
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
    const result = await graphqlFetch(RequestDiagnosesActive, {});
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
          // An request always HAS a patient: never cleared, only swapped
          // (ui-standards/controls § clearability follows optionality).
          clearable={false}
          onEditPatient={props.onEditPatient}
          onSelect={patient =>
            patient && props.onSave({ patientId: patient.id })
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
              prescriptionDatetime: prescriptionRequestDateInstant(day),
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
      {/* The prescriber — the account that created the request, which on a
          request IS who prescribed it (spec/prescription-requests § who
          prescribed). Provenance, never editable, so it closes the fixed
          cluster as a read-only value rather than a disabled input
          (kdd/form-layout); `variant="field"` lines it up with the small
          inputs beside it. The testid keeps its name — it identifies the
          field, and e2e/TESTIDS.md is a cross-front-end contract. */}
      <FormRowItem weight={1} minWidth="8rem">
        <LabelledValue
          variant="field"
          size="small"
          label={t('label.prescriber')}
        >
          <UserLabel
            username={props.node.user?.username}
            email={props.node.user?.email}
            label={t('label.prescriber')}
            testId="toolbar-entered-by-field"
          />
        </LabelledValue>
      </FormRowItem>
      {/* Prominent custom fields — save-on-change, the prescription_request
          scope (rules § custom fields; AC-F1). */}
      <CustomFieldsToolbar
        scope="prescription_request"
        recordId={props.node.id}
        values={props.node.customFields}
        disabled={props.disabled}
        layout="field"
        onSave={patch => props.onSave({ customFields: patch })}
      />
    </>
  );
};
