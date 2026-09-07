import { createMemo, createResource, type Component } from 'solid-js';
import { FormRowItem } from '@/ui/layout/Form/FormRowItem';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
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
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { Text } from '../../../ui/elements/typography/Text';
import {
  CustomFieldsToolbar,
  EMPTY_FIELD_VALUE,
} from '../../../domain/customFields';
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
// <HeaderToolbar>: Patient · Date of birth · Clinician · Date · Diagnosis,
// then the scope's prominent custom fields (weight, unit, category,
// occupation). Weighted shares follow the dispensing toolbar's measured layout
// (person-name fields take the biggest shares; the date is pinned at its 9rem
// format width). Every field is read-only past New (AC-N5); unlike dispensing,
// a date change never touches lines — the request's lines carry no stock, so
// nothing needs clearing.
//
// Date of birth is here, not in the side panel, because the prescriber reads it
// while they prescribe: it is what the weight beside it is judged against
// (issue #514). It is the patient's fact, read live from the patient record and
// never editable here — the patient picker's edit affordance is the way to
// change it. Entered by went the other way, to the side panel: it is
// provenance, not something anyone prescribes against.

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
      {/* Date of birth — the patient's, read live from the patient record
          (rules § patient data is live) and never editable from here. A
          read-only value rather than a disabled input, so read-only reads from
          the absence of an input box (kdd/form-layout); `variant="field"`
          lines it up with the small inputs beside it, and the 9rem floor is the
          date's own format width, as the prescription date below. */}
      <FormRowItem weight={0} minWidth="9rem">
        <LabelledValue
          variant="field"
          size="small"
          label={t('label.date-of-birth')}
        >
          <Text variant="body" data-testid="toolbar-date-of-birth-field">
            {props.node.patient?.dateOfBirth
              ? localisedDate(props.node.patient.dateOfBirth)
              : EMPTY_FIELD_VALUE}
          </Text>
        </LabelledValue>
      </FormRowItem>
      {/* The clinician the request names — an ordinary editable field while
          New, chosen at creation, and NOT the same fact as the side panel's
          Entered by (rules § who is recorded). It is what fills the generated
          dispensation's own clinician at the hand-over. */}
      <FormRowItem weight={1.55}>
        <ClinicianSelect
          label={t('label.clinician')}
          size="small"
          inputTestId="clinician-select"
          // The create-clinician side flow, under this cluster's editability
          // gate — the picker withholds it while disabled.
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
              prescriptionDatetime: prescriptionRequestDateInstant(day),
            });
          }}
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
