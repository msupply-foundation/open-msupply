import { generateUUID } from '../../../uuid';
import { createEffect, createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { PatientSearch, type PatientOption } from '../../../domain/patient';
import {
  ClinicianSelect,
  clinicianMatchingUser,
} from '../../../domain/clinician';
import { CreatePatientModal } from '../../patients';
import { newPrescriptionRequestDate } from '../detail/prescriptionRequestUpdate';
import { InsertPrescriptionRequest } from './createPrescriptionRequest.generated';

// The create-request dialog (spec/prescription-requests/ui-surface.md S2,
// AC-C1.. C3): patient (the one required field — the reusable patient picker),
// date (defaults today, capped at today) and clinician. Create is unavailable
// until a patient is chosen; a rejection shows in-dialog with entries intact
// (rejections here are all generic — contract § wire traps); success navigates
// to the new request's detail.
//
// The clinician is chosen HERE rather than at the hand-over (AC-C6): it is a
// field of the request, like the patient beside it, and asking for it at the
// one moment the request can no longer be edited put it in the wrong place. It
// defaults to the clinician whose code is the signed-in username, because the
// prescriber usually enters their own script (see clinicianMatchingUser).

export interface CreatePrescriptionRequestModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreatePrescriptionRequestModal: Component<
  CreatePrescriptionRequestModalProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = createSignal<PatientOption | null>(null);
  const [date, setDate] = createSignal<string>(localTodayIso());
  const [clinicianId, setClinicianId] = createSignal<string>();
  // The default only ever applies to an UNTOUCHED field: once the user has
  // picked (or cleared) a clinician, the seed below leaves it alone.
  const [clinicianTouched, setClinicianTouched] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();
  // The create-patient-on-no-match sub-flow (the patients vertical's create
  // modal over this dialog); on success the new patient is selected here.
  const [createPatientOpen, setCreatePatientOpen] = createSignal(false);

  // Seed the default. An EFFECT rather than an initial value, because the
  // clinician list loads asynchronously — the match is unknown while the
  // dialog is opening and arrives a moment later.
  createEffect(() => {
    if (!props.open || clinicianTouched()) return;
    const match = clinicianMatchingUser();
    if (match) setClinicianId(match.id);
  });

  const reset = () => {
    setPatient(null);
    setDate(localTodayIso());
    setClinicianId(undefined);
    setClinicianTouched(false);
    setError(undefined);
  };
  const close = () => {
    reset();
    props.onClose();
  };

  const create = async () => {
    const chosen = patient();
    if (!chosen || busy()) return;
    // Today means "the creation moment" — the field is left out entirely so
    // the server stamps it (see newPrescriptionRequestDate).
    const backdatedTo = newPrescriptionRequestDate(date());
    setBusy(true);
    setError(undefined);
    // Creation rejections are all generic (contract § wire traps), so opt in
    // to the raw GraphQL errors and show them in-dialog rather than tripping
    // the global modal for a user-correctable input.
    const result = await graphqlFetch(
      InsertPrescriptionRequest,
      {
        storeId: params.storeId,
        input: {
          id: generateUUID(),
          patientId: chosen.id,
          ...(clinicianId() ? { clinicianId: clinicianId() } : {}),
          ...(backdatedTo ? { prescriptionDatetime: backdatedTo } : {}),
        },
      },
      { returnGraphqlErrors: true }
    );
    setBusy(false);
    if (result.kind === 'success') {
      const id = result.data.insertPrescriptionRequest.id;
      close();
      navigate(`/${params.storeId}/dispensary/prescription-request/${id}`);
      return;
    }
    setError(
      result.kind === 'graphqlError'
        ? result.message
        : t('error.something-wrong')
    );
  };

  // The patient picker is the dialog's only required field, so it takes
  // initial focus (ui-standards › accessibility › keyboard).
  const patientSearch = createFocusTarget();

  return (
    <Dialog
      open={props.open}
      onClose={close}
      initialFocus={patientSearch}
      title={t('button.new-prescription')}
      testId="create-prescription-request-modal"
      actionsLead={
        <Show when={error()}>
          <Alert severity="error">{error()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="dialog-button-cancel"
            onClick={close}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            disabled={!patient()}
            loading={busy()}
            onClick={() => void create()}
          >
            {t('label.create')}
          </Button>
        </>
      }
    >
      <FieldRow label={t('label.patient')}>
        <PatientSearch
          label={t('label.patient')}
          hideLabel
          storeId={params.storeId}
          selected={patient() ?? undefined}
          focusTarget={patientSearch}
          onSelect={setPatient}
          onCreatePatient={() => setCreatePatientOpen(true)}
        />
      </FieldRow>
      <FieldRow label={t('label.date')}>
        <DateField
          label={t('label.date')}
          hideLabel
          testId="date-field"
          value={date()}
          max={localTodayIso()}
          onChange={value => setDate(value ?? localTodayIso())}
        />
      </FieldRow>
      <FieldRow label={t('label.clinician')}>
        <ClinicianSelect
          label={t('label.clinician')}
          hideLabel
          inputTestId="clinician-select"
          value={clinicianId()}
          // The create-clinician side flow: the picker owns it, and a clinician
          // created here comes back selected.
          allowCreate
          storeId={params.storeId}
          onChange={clinician => {
            setClinicianTouched(true);
            setClinicianId(clinician?.id);
          }}
        />
      </FieldRow>
      <CreatePatientModal
        open={createPatientOpen()}
        storeId={params.storeId}
        onClose={() => setCreatePatientOpen(false)}
        onCreated={created => {
          setPatient(created);
          setCreatePatientOpen(false);
        }}
      />
    </Dialog>
  );
};
