import { generateUUID } from '../../uuid';
import { createSignal, Show, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { TextField } from '../../ui/elements/inputs/TextField';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { FormErrorSummary } from '../../ui/layout/Form/FormErrorSummary';
import { createFormValidation } from '../../ui/layout/Form/formValidation';
import { createFocusTarget } from '../../ui/utils/createFocusTarget';
import { PlusCircleIcon, SaveIcon, XCircleIcon } from '../../ui/icons';
import { genderOptions, type GenderOption } from '../patient';
import { runInsertClinician } from './clinicianApi';
import {
  clinicianFieldErrors,
  codeAlreadyUsed,
  emptyDraft,
  toInsertInput,
  type ClinicianDraft,
} from './clinicianDraft';
import { cliniciansResource, type Clinician } from './clinicianResource';

// The create-clinician side flow (spec/prescriptions ui-surface S8) — the
// surface the clinicians register delegates to the prescribing flows. Opened
// from the clinician picker's own listbox, over whichever screen owns that
// picker, and reporting the created clinician back so the picker can select it.
export interface CreateClinicianModalProps {
  open: boolean;
  storeId: string;
  onClose: () => void;
  /**
   * The created clinician, read back from the refreshed store list — so the
   * picker's controlled value always resolves to a real option. Fires before
   * the modal closes itself.
   */
  onCreated: (clinician: Clinician) => void;
}

export const CreateClinicianModal: Component<
  CreateClinicianModalProps
> = props => (
  // Remount per open, so the draft, validation, and error are always fresh.
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<CreateClinicianModalProps> = props => {
  const [draft, setDraft] = createStore<ClinicianDraft>(emptyDraft());
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');
  // A save held back by the duplicate-code confirmation (`.67`).
  const [confirmingCode, setConfirmingCode] = createSignal(false);

  // Code + last name + initials, quiet until Save is attempted.
  const validation = createFormValidation(() => clinicianFieldErrors(draft));

  // Code is the first required field, so it takes the dialog's initial focus
  // (ui-standards › accessibility › keyboard).
  const codeField = createFocusTarget();

  const insert = async () => {
    setSaving(true);
    setSaveError('');
    const outcome = await runInsertClinician(
      props.storeId,
      toInsertInput(generateUUID(), draft)
    );
    if (!outcome) {
      setSaving(false);
      return; // handled globally
    }
    if (outcome.kind === 'error') {
      setSaving(false);
      setSaveError(outcome.message);
      return;
    }
    // Read the new clinician back off the refreshed list rather than minting an
    // option here: the picker is a controlled combobox over that same list, so
    // handing it a value the list does not yet carry renders the field blank
    // until the refetch lands (kdd/solid-reactivity-pitfalls).
    await cliniciansResource.refetch();
    const created = cliniciansResource
      .noSuspense()
      .find(clinician => clinician.id === outcome.id);
    setSaving(false);
    if (!created) {
      // The insert succeeded but the store list does not carry it — nothing
      // valid to select, so report the failure rather than silently closing.
      setSaveError(t('error.failed-to-save-clinician'));
      return;
    }
    props.onCreated(created);
    props.onClose();
  };

  const save = () => {
    if (saving()) return;
    validation.arm();
    if (!validation.valid()) return;
    // A shared code is legal — warn, then let the user proceed (`.67`).
    if (codeAlreadyUsed(cliniciansResource.noSuspense(), draft.code)) {
      setConfirmingCode(true);
      return;
    }
    void insert();
  };

  return (
    <>
      <Dialog
        open
        testId="create-clinician-modal"
        title={t('label.create-clinician')}
        icon={<PlusCircleIcon />}
        dismissable={!saving()}
        initialFocus={codeField}
        onClose={props.onClose}
        widthRem={32}
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
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              icon={<SaveIcon />}
              data-testid="dialog-button-ok"
              loading={saving()}
              onClick={save}
            >
              {t('button.save')}
            </Button>
          </>
        }
      >
        <TextField
          ref={codeField.ref}
          label={t('label.code')}
          required
          data-testid="input-clinician-code"
          error={validation.errorFor('code')}
          value={draft.code}
          // Codes are recorded upper-case, so the field shows what will be
          // stored rather than correcting it silently on save.
          onInput={e => setDraft('code', e.currentTarget.value.toUpperCase())}
        />
        <TextField
          label={t('label.first-name')}
          data-testid="input-clinician-firstName"
          value={draft.firstName}
          onInput={e => setDraft('firstName', e.currentTarget.value)}
        />
        <TextField
          label={t('label.last-name')}
          required
          data-testid="input-clinician-lastName"
          error={validation.errorFor('lastName')}
          value={draft.lastName}
          onInput={e => setDraft('lastName', e.currentTarget.value)}
        />
        <TextField
          label={t('label.initials')}
          required
          data-testid="input-clinician-initials"
          error={validation.errorFor('initials')}
          value={draft.initials}
          onInput={e => setDraft('initials', e.currentTarget.value)}
        />
        <TextField
          label={t('label.mobile')}
          inputmode="tel"
          data-testid="input-clinician-mobile"
          value={draft.mobile}
          onInput={e =>
            setDraft('mobile', e.currentTarget.value.replace(/[^0-9]/g, ''))
          }
        />
        <Combobox<GenderOption>
          label={t('label.gender')}
          items={genderOptions()}
          itemToString={option => option.label}
          itemToValue={option => option.value}
          inputTestId="input-clinician-gender"
          value={draft.gender ?? undefined}
          onChange={option => setDraft('gender', option?.value ?? null)}
        />
        <FormErrorSummary
          errors={validation.visible()}
          testId="create-clinician-error-summary"
        />
      </Dialog>

      {/* A code another clinician already carries is a warning, not a
          rejection — the server never checks it and two may share one. */}
      <ConfirmDialog
        open={confirmingCode()}
        onClose={() => setConfirmingCode(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.clinician-code-already-exists')}
        onConfirm={() => {
          setConfirmingCode(false);
          void insert();
        }}
      />
    </>
  );
};
