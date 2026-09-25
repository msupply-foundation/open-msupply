import { createSignal, Show, type JSX } from 'solid-js';
import { t } from '../../../../intl';
import { authUser, userDisplayName } from '../../../../auth/authContext';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Select } from '../../../../ui/elements/selectors/Select';
import { DateTimeField } from '../../../../ui/elements/inputs/DateTimeField';
import { TextArea } from '../../../../ui/elements/inputs/TextArea';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { PlusCircleIcon, XCircleIcon } from '../../../../ui/icons';
import { createFormValidation } from '../../../../ui/layout/Form/formValidation';
import { ClinicianSelect, type Clinician } from '../../../../domain/clinician';
import type { Encounter } from '../../../../plugin-sdk/documents';
import { persistDocument } from '../../../../domain/documentForm/createDocumentForm';
import { withFirstNoteText } from '../../../../domain/documentForm/notes';
import type { FormRegistryFragment } from '../../../../domain/documentForm/documentForm.generated';

export interface CreatedEncounter {
  /** The encounter's row id, which its record screen's route takes. */
  encounterId: string;
  startDatetime: string;
}

export interface CreateEncounterDialogProps {
  open: boolean;
  storeId: string;
  patientId: string;
  /**
   * The Encounter registry entries for the programs the patient is enrolled
   * in: the server refuses an encounter in any other program.
   */
  registries: FormRegistryFragment[];
  /** Preselected type: the patient's latest encounter's, as the old client. */
  defaultType?: string;
  onCreated: (created: CreatedEncounter) => void;
  onClose: () => void;
}

/*
 * "New encounter" (implementation-plan H8, the old client's create dialog):
 * the type, the visit date, the clinician and a note, written as a Scheduled
 * encounter the moment Create is pressed. The caller then opens the
 * encounter, or, for a visit in the future, stays on the patient: that is how
 * a follow-up is scheduled. The encounter's own form is on its record screen;
 * nothing of it is asked for here.
 */
export const CreateEncounterDialog = (
  props: CreateEncounterDialogProps
): JSX.Element => (
  <Show when={props.open}>
    <CreateEncounterBody {...props} />
  </Show>
);

const CreateEncounterBody = (
  props: CreateEncounterDialogProps
): JSX.Element => {
  const initialType = () => {
    const wanted = props.defaultType;
    const match = props.registries.find(r => r.documentType === wanted);
    return (match ?? props.registries[0])?.id;
  };
  const [registryId, setRegistryId] = createSignal(initialType());
  const [startDatetime, setStartDatetime] = createSignal<string | null>(
    new Date().toISOString()
  );
  const [clinician, setClinician] = createSignal<Clinician | null>(null);
  const [note, setNote] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string>();

  const validation = createFormValidation(() => [
    { id: 'type', label: t('label.encounter'), failed: !registryId() },
    {
      id: 'startDatetime',
      label: t('label.visit-date'),
      failed: !startDatetime(),
    },
  ]);

  const create = async () => {
    if (saving()) return;
    validation.arm();
    const registry = props.registries.find(r => r.id === registryId());
    const start = startDatetime();
    if (!validation.valid() || !registry || !start) return;
    const now = new Date().toISOString();
    const user = authUser();
    const c = clinician();
    const data: Encounter = {
      createdDatetime: now,
      createdBy: { id: user?.userId, username: user?.username },
      status: 'PENDING',
      location: { storeId: props.storeId },
      startDatetime: start,
      clinician: c
        ? {
            id: c.id,
            firstName: c.firstName ?? undefined,
            lastName: c.lastName,
          }
        : undefined,
      notes: withFirstNoteText(
        undefined,
        note(),
        { id: user?.userId, name: userDisplayName() },
        now
      ),
    };
    setSaving(true);
    setSaveError(undefined);
    const outcome = await persistDocument({
      storeId: props.storeId,
      patientId: props.patientId,
      registry,
      parent: undefined,
      data,
    });
    setSaving(false);
    if (outcome.kind === 'refused') {
      setSaveError(outcome.message);
      return;
    }
    if (outcome.kind === 'reported') return;
    props.onCreated({ encounterId: outcome.recordId, startDatetime: start });
  };

  return (
    <Dialog
      open
      width="form"
      dismissable={!saving()}
      onClose={props.onClose}
      title={t('label.new-encounter')}
      testId="create-encounter-dialog"
      actionsLead={
        <Show when={saveError()}>
          <Alert severity="error">{saveError()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            confirms="cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<PlusCircleIcon />}
            confirms="plain"
            data-testid="dialog-button-ok"
            loading={saving()}
            onClick={() => void create()}
          >
            {t('button.create')}
          </Button>
        </>
      }
    >
      <Show
        when={props.registries.length > 0}
        fallback={
          <Alert severity="info">
            {t('messages.no-encounters-configured')}
          </Alert>
        }
      >
        <Stack>
          <Select
            label={t('label.encounter')}
            options={props.registries.map(r => ({
              value: r.id,
              label: r.name ?? r.documentType,
            }))}
            value={registryId()}
            onValueChange={setRegistryId}
            required
            error={validation.errorFor('type')}
            testId="create-encounter-type"
          />
          <DateTimeField
            label={t('label.visit-date')}
            value={startDatetime()}
            onChange={setStartDatetime}
            required
            error={validation.errorFor('startDatetime')}
            testId="create-encounter-visit-date"
          />
          <ClinicianSelect
            label={t('label.clinician')}
            value={clinician()?.id}
            onChange={setClinician}
            inputTestId="create-encounter-clinician"
          />
          <TextArea
            label={t('label.visit-notes')}
            rows={3}
            value={note()}
            onInput={e => setNote(e.currentTarget.value)}
            data-testid="create-encounter-notes"
          />
        </Stack>
      </Show>
    </Dialog>
  );
};
