import {
  createMemo,
  createSignal,
  Match,
  Show,
  Switch,
  type JSX,
} from 'solid-js';
import { t } from '../../../../intl';
import { authUser } from '../../../../auth/authContext';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../../../../ui/elements/feedback/ConfirmDialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { Button } from '../../../../ui/elements/buttons/Button';
import { SaveIcon, XCircleIcon } from '../../../../ui/icons';
import { FormRow } from '../../../../ui/layout/Form/FormRow';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { FormErrorSummary } from '../../../../ui/layout/Form/FormErrorSummary';
import type { Encounter } from '../../../../plugin-sdk/documents';
import { createDocumentForm } from '../../../../domain/documentForm/createDocumentForm';
import {
  EncounterClinicianField,
  EncounterStatusField,
  EncounterVisitDateField,
  encounterVisitLabels,
} from '../../../../domain/encounter/EncounterVisitFields';
import { DocumentFormRegion } from '../../../../plugins/DocumentFormRegion';
import { documentFormVersioning } from '../../../../plugins/documentFormSlot';
import type { FormRegistryFragment } from '../../../../domain/documentForm/documentForm.generated';

export interface EncounterFormModalProps {
  storeId: string;
  patientId: string;
  /** The encounter type to record; undefined while closed. */
  registry: FormRegistryFragment | undefined;
  onClose: () => void;
  /** After a save, so the caller can refresh what the encounter changes. */
  onSaved: () => void;
}

/*
 * A new encounter's form in a modal (kdd/custom-forms/specs.md § Forms in the
 * UI: the modal mount point), opened by a trigger on the patient screen's
 * header (`openDocumentForm`). The document form host over one new Encounter
 * document: the visit date, clinician and status the record screen's toolbar
 * edits, above the form contributed for the type or the host's default
 * encounter form (DocumentFormRegion), so the form is the same one the record
 * screen shows and receives the same draft. Nothing is written until Save; the
 * modal remounts per open.
 */
export const EncounterFormModal = (
  props: EncounterFormModalProps
): JSX.Element => (
  <Show when={props.registry} keyed>
    {registry => (
      <EncounterFormModalBody
        storeId={props.storeId}
        patientId={props.patientId}
        registry={registry}
        onClose={props.onClose}
        onSaved={props.onSaved}
      />
    )}
  </Show>
);

interface BodyProps extends Omit<EncounterFormModalProps, 'registry'> {
  registry: FormRegistryFragment;
}

const EncounterFormModalBody = (props: BodyProps): JSX.Element => {
  // The seed, fixed at open: a visit being recorded now, at this store, by
  // this user. The form and the visit fields fill in the rest.
  const source = createMemo(() => {
    const now = new Date().toISOString();
    const user = authUser();
    const data: Encounter = {
      createdDatetime: now,
      createdBy: { id: user?.userId, username: user?.username },
      status: 'VISITED',
      location: { storeId: props.storeId },
      startDatetime: now,
    };
    return { kind: 'new' as const, registry: props.registry, data };
  });

  const form = createDocumentForm<Encounter>({
    storeId: () => props.storeId,
    patientId: () => props.patientId,
    source,
    labels: encounterVisitLabels,
    versioning: type => documentFormVersioning('encounter.form', type),
  });

  const [confirmDiscard, setConfirmDiscard] = createSignal(false);
  const close = () => {
    if (form.isDirty()) setConfirmDiscard(true);
    else props.onClose();
  };

  const save = async () => {
    const saved = await form.save();
    if (!saved) return;
    props.onSaved();
    props.onClose();
  };

  return (
    <>
      <Dialog
        open
        width="form"
        dismissable={!form.saving()}
        onClose={close}
        title={props.registry.name ?? props.registry.documentType}
        testId="encounter-form-modal"
        actionsLead={
          <Show when={form.saveError()}>
            <Alert severity="error">{form.saveError()}</Alert>
          </Show>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              confirms="cancel"
              onClick={close}
            >
              {t('button.cancel')}
            </Button>
            <Button
              icon={<SaveIcon />}
              confirms="plain"
              data-testid="dialog-button-ok"
              loading={form.saving()}
              disabled={form.status() !== 'ready' || !form.canSave()}
              onClick={() => void save()}
            >
              {t('button.save')}
            </Button>
          </>
        }
      >
        <Switch>
          <Match when={form.status() === 'ready' && form.library()}>
            {lib => {
              const Default = lib().DefaultEncounterForm;
              return (
                <Stack>
                  <FormRow>
                    <EncounterVisitDateField draft={form.draft} />
                    <EncounterStatusField draft={form.draft} />
                  </FormRow>
                  <EncounterClinicianField draft={form.draft} />
                  <DocumentFormRegion
                    slot="encounter.form"
                    documentType={props.registry.documentType}
                    draft={form.draft}
                    record={{
                      patientId: props.patientId,
                      documentName: form.document()?.name,
                    }}
                    participation={form.coordinator.participationFor}
                    fallback={() => <Default draft={form.draft} />}
                    currentSchemaId={props.registry.formSchemaId}
                    recorded={form.recorded()}
                  />
                  <FormErrorSummary
                    errors={form.validation.visible()}
                    testId="encounter-form-modal-error-summary"
                  />
                </Stack>
              );
            }}
          </Match>
          <Match when={true}>
            <Spinner center />
          </Match>
        </Switch>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard()}
        title={t('heading.are-you-sure')}
        message={t('messages.discard-changes')}
        confirmLabel={t('button.discard')}
        onConfirm={() => {
          setConfirmDiscard(false);
          props.onClose();
        }}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
};
