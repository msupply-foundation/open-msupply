import { generateUUID } from '../../../uuid';
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  Switch,
  Match,
  untrack,
  type Component,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { Dynamic } from 'solid-js/web';
import { useNavigate } from '@solidjs/router';
import { t, tPlural } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { FormErrorSummary } from '../../../ui/layout/Form/FormErrorSummary';
import { createFormValidation } from '../../../ui/layout/Form/formValidation';
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  PlusCircleIcon,
  RefreshIcon,
  SaveIcon,
  XCircleIcon,
} from '../../../ui/icons';
import { Text } from '../../../ui/elements/typography/Text';
import { StatusBadge } from '../../../ui/elements/feedback/StatusBadge';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { remToPx } from '../../../ui/utils/rem';
import {
  minimalPatientOption,
  type NewPatientSeed,
  type PatientOption,
} from '../../../domain/patient';
import { linkPatientToStore } from '../../../domain/patient/patientResource';
import { type PatientFindRow } from '../../../domain/patient/patientFind';
import { patientFindColumns } from '../../../domain/patient/patientFindColumns';
import {
  createDuplicateCheck,
  type DuplicateMatch,
} from '../../../domain/patient/duplicateCheck';
import { runInsertPatient } from '../patientApi';
import {
  emptyDraft,
  patientFieldErrors,
  toInsertInput,
  type PatientDraft,
} from '../detail/patientEdit';
import {
  createCodeTakenCheck,
  generatedCodeFits,
  generatePatientCode,
} from '../../../domain/patient/patientCode';
import { currentStoreName } from '../../../store/storeContext';
import type { Patient } from '../../../plugin-sdk/documents';
import type { Draft } from '../../../domain/documentForm/draft';
import { gated } from '../../../api/gated';
import { PatientDetailsForm } from '../detail/PatientDetailsForm';
import {
  seedNewPatientDocument,
  type NewPatientFields,
} from '../detail/patientDocumentSeed';
import { fetchPatientRegistry } from '../detail/programs/programsApi';

// S2 — creating a patient (spec/patients; #631 spike). The patient search
// comes first, in PatientSearchDialog: this dialog opens only once the user
// has looked and pressed New patient, so it is just the details form, filled
// in from what they searched with. It saves on the store's persistence path:
// the plain-path form over the patient record, or, where the store has a
// Patient registry entry, its patient form over the new patient's first
// document (spec/patients › effects of creation). A fresh patient identifier
// is minted when the modal opens (OMS-REG-DIS-01.4/.7/.32), so a duplicate-id
// rejection is unreachable.

const emptyFields = (): NewPatientFields => ({
  firstName: '',
  lastName: '',
  dateOfBirth: null,
  gender: null,
  address: '',
  phone: '',
});

// The document path's form host and its view, loaded the first time the
// form takes that path rather than with this module: the startup bundle reaches
// the create dialog through the dashboard's new prescription request, and the
// form host must stay out of it (vite/lazyChunkGuard.ts). One load, shared by
// every opening of the modal; a failed one is forgotten, so the next tries
// again.
interface DocumentPathModules {
  createEditor: typeof import('../detail/patientDocumentEditor').createNewPatientDocumentEditor;
  View: typeof import('../detail/PatientDocumentFormView').PatientDocumentFormView;
}
let documentPathModules: DocumentPathModules | undefined;
let documentPathLoading: Promise<DocumentPathModules> | undefined;
const loadDocumentPath = () =>
  (documentPathLoading ??= Promise.all([
    import('../detail/patientDocumentEditor'),
    import('../detail/PatientDocumentFormView'),
  ]).then(
    ([editor, view]) =>
      (documentPathModules = {
        createEditor: editor.createNewPatientDocumentEditor,
        View: view.PatientDocumentFormView,
      }),
    error => {
      documentPathLoading = undefined;
      throw error;
    }
  ));

export interface CreatePatientModalProps {
  open: boolean;
  storeId: string;
  onClose: () => void;
  /**
   * When set, the modal is being used to create-and-return a patient for
   * another surface (e.g. the prescription create dialog — spec/prescriptions
   * OMS-REG-DIS-01.4/.7/.32): on a successful create it calls this with the new
   * patient and closes, INSTEAD of navigating to the patient detail. Omit for
   * the standalone list flow (navigate to the new patient).
   */
  onCreated?: (patient: PatientOption) => void;
  /** What the user searched with, to start the form from. */
  seed?: NewPatientSeed;
  /** The save button's label: Save, or Save & dispense from dispensing. */
  saveLabel?: string;
  /**
   * A possible duplicate was chosen in Review, instead of creating a patient
   * (spec/patients S2 › the duplicate check). Already in this store. A
   * returned message is shown in the dialog. Omit to open the patient.
   */
  onChooseExisting?: (
    patient: PatientFindRow
  ) => Promise<string | undefined> | void;
}

const likelyCount = (matches: DuplicateMatch[]) =>
  matches.filter(m => m.likely.length > 0).length;

export const CreatePatientModal: Component<CreatePatientModalProps> = props => {
  const navigate = useNavigate();
  const [patientId, setPatientId] = createSignal('');
  const [draft, setDraft] = createStore<PatientDraft>(emptyDraft());
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');

  // The store's Patient registry entry decides the form's path, as it decides
  // the Details tab's (patientDetails.ts). Read each time the modal opens,
  // non-suspending, since the modal is already open.
  const [registryData, { refetch: refetchRegistry }] = createResource(
    () => (props.open ? props.storeId : undefined),
    fetchPatientRegistry
  );
  const registry = () => gated(registryData);
  const onDocumentPath = () => registry()?.entry !== undefined;
  // A read that failed answers, with nothing: the path is unknown, so the
  // dialog says so rather than guessing the plain path, which on a store with a
  // Patient entry would create a patient without its document.
  const registryFailed = () =>
    registryData.state === 'ready' && registryData.latest === undefined;

  // The document path's form: the new patient's first document, seeded from
  // the search (seedNewPatientDocument).
  const [seedFields, setSeedFields] = createSignal<NewPatientFields>();
  const documentSeed = createMemo((): Patient | undefined => {
    const fields = seedFields();
    return fields ? seedNewPatientDocument(patientId(), fields) : undefined;
  });
  const [documentPath, setDocumentPath] = createSignal(documentPathModules);
  const [documentPathFailed, setDocumentPathFailed] = createSignal(false);
  createEffect(() => {
    if (onDocumentPath() && !documentPath()) {
      loadDocumentPath().then(
        modules => setDocumentPath(() => modules),
        () => setDocumentPathFailed(true)
      );
    }
  });
  // Made once, when the modules arrive, and untracked, so nothing the editor
  // reads as it is made can remake it and lose the draft; undefined on the
  // plain path.
  const newDocument = createMemo(() => {
    const modules = documentPath();
    return modules
      ? untrack(() =>
          modules.createEditor({
            storeId: () => props.storeId,
            patientId,
            registry: () => registry()?.entry,
            seed: documentSeed,
          })
        )
      : undefined;
  });

  // Duplicate-code check (spec/patients § generating a code), run on the save
  // attempt below. No saved code to compare against while creating, so every
  // non-empty code is checked.
  const codeCheck = createCodeTakenCheck({
    storeId: () => props.storeId,
    code: () => draft.code,
    savedCode: () => '',
    patientId: () => undefined,
  });

  // Validation (OMS-REG-DIS-01.5/.6/.30): required errors stay
  // quiet until the first Save attempt, then surface per field and as the
  // summary below the form.
  const validation = createFormValidation(() =>
    patientFieldErrors(draft, codeCheck.taken())
  );

  // Mint a fresh identifier and start the form from the search each time the
  // modal opens (OMS-REG-DIS-01.4/.7/.32).
  createEffect(() => {
    if (props.open) {
      const fields = {
        ...emptyFields(),
        ...(props.seed && {
          firstName: props.seed.firstName,
          lastName: props.seed.lastName,
          dateOfBirth: props.seed.dateOfBirth,
        }),
      };
      setPatientId(generateUUID());
      setSeedFields(fields);
      setDraft({
        ...emptyDraft(),
        firstName: fields.firstName,
        lastName: fields.lastName,
        gender: fields.gender,
        dateOfBirth: fields.dateOfBirth,
        address1: fields.address,
        phone: fields.phone,
      });
      setSaveError('');
      validation.reset();
      setReviewing(false);
      setChooseError(undefined);
      duplicates.reset();
      // The searched names may already match someone: say so straight away.
      queueMicrotask(() => void duplicates.run());
    }
  });

  // The duplicate check (spec/patients S2 › the duplicate check), on whichever
  // form is showing: the plain draft, or the document form's data.
  const duplicates = createDuplicateCheck({
    storeId: () => props.storeId,
    terms: () => {
      const data = onDocumentPath() ? newDocument()?.form.draft.data : draft;
      return {
        firstName: data?.firstName ?? '',
        lastName: data?.lastName ?? '',
        dateOfBirth: data?.dateOfBirth ?? null,
        nationalId: data?.code2 ?? '',
      };
    },
  });

  // The code starts out generated, once per opening, on whichever form is
  // showing (#631; spec/patients § generating a code). It stays editable,
  // with Generate beside it. Left empty where the schema's pattern would
  // refuse a generated code, as Generate is then left out too.
  let generatedFor = '';
  const fillCode = async (
    id: string,
    storeName: string,
    doc: Draft<Patient> | undefined
  ) => {
    const code = await generatePatientCode(props.storeId, storeName, id);
    // Dropped if the form moved on to another patient, or a code was typed
    // meanwhile; a failed draw is already shown globally.
    if (!code || patientId() !== id) return;
    if (doc) {
      if (doc.data.id === id && !doc.data.code) doc.set('code', code);
    } else if (!draft.code) setDraft('code', code);
  };
  createEffect(() => {
    const id = patientId();
    const storeName = currentStoreName();
    if (!props.open || !id || !storeName || generatedFor === id) return;
    if (registryData.state !== 'ready' || registryFailed()) return;
    // The document form's draft only once it's seeded for this patient,
    // which would otherwise wipe the code.
    const form = onDocumentPath() ? newDocument()?.form : undefined;
    if (onDocumentPath() && form?.status() !== 'ready') return;
    const doc = form?.draft;
    generatedFor = id;
    if (doc && !generatedCodeFits(storeName, doc.schemaFor('code')?.pattern))
      return;
    void fillCode(id, storeName, doc);
  });

  const [reviewing, setReviewing] = createSignal(false);
  const [choosingMatch, setChoosingMatch] = createSignal(false);
  const [chooseError, setChooseError] = createSignal<string>();

  // Using a possible duplicate instead of creating: one from another facility
  // is added to this store first.
  const chooseMatch = async (match: DuplicateMatch) => {
    if (choosingMatch()) return;
    setChoosingMatch(true);
    setChooseError(undefined);
    if (match.where === 'elsewhere') {
      const linked = await linkPatientToStore(props.storeId, match.id);
      if (linked.kind !== 'ok') {
        setChoosingMatch(false);
        if (linked.kind === 'unreachable')
          setChooseError(
            linked.message || t('messages.failed-to-reach-central')
          );
        return;
      }
    }
    if (props.onChooseExisting) {
      const message = await props.onChooseExisting(match);
      setChoosingMatch(false);
      if (message) setChooseError(message);
      return;
    }
    setChoosingMatch(false);
    props.onClose();
    navigate(`/${props.storeId}/dispensary/patients/${match.id}`);
  };

  const setDraftField = <K extends keyof PatientDraft>(
    key: K,
    value: PatientDraft[K]
  ) => setDraft(key, value);

  // Hand the new patient back to the caller and close
  // (OMS-REG-DIS-01.4/.7/.32), or open its detail.
  const finish = (id: string, firstName: string, lastName: string) => {
    if (props.onCreated) {
      const name = [lastName, firstName].filter(Boolean).join(', ');
      props.onClose();
      props.onCreated(minimalPatientOption(id, name));
      return;
    }
    props.onClose();
    navigate(`/${props.storeId}/dispensary/patients/${id}`);
  };

  // The document path's create: the editor validates against the installed
  // schema, checks the code and writes the patient with its first document.
  const saveDocument = async () => {
    const editor = newDocument();
    if (!editor || !(await editor.create())) return;
    const data = editor.form.draft.data;
    finish(patientId(), data.firstName, data.lastName);
  };

  const save = async () => {
    if (onDocumentPath()) return saveDocument();
    if (saving()) return;
    validation.arm();
    if (!validation.valid()) return;
    setSaving(true);
    setSaveError('');
    // The one rule that needs the server (DIS-02 `.57`) — a clash abandons the
    // save with the error left on the Code field.
    if (await codeCheck.check()) {
      setSaving(false);
      return;
    }
    const outcome = await runInsertPatient(
      props.storeId,
      toInsertInput(patientId(), draft)
    );
    setSaving(false);
    if (!outcome) return; // handled globally
    if (outcome.kind === 'error') {
      setSaveError(outcome.message);
      return;
    }
    finish(outcome.id, draft.firstName, draft.lastName);
  };

  const busy = () =>
    saving() || choosingMatch() || (newDocument()?.saving() ?? false);
  const formError = () =>
    onDocumentPath() ? newDocument()?.saveError() : saveError();
  // The document form, once its modules have loaded and its form is
  // ready to edit.
  const readyDocument = () => {
    const View = documentPath()?.View;
    const form = newDocument()?.form;
    return View && form?.status() === 'ready' ? { View, form } : undefined;
  };
  // The document path's code that did not load: a failed module load is
  // kept by the browser, so a reload, not a retry, fetches it again.
  const formNotLoaded = () =>
    documentPathFailed() || (newDocument()?.form.libraryFailed() ?? false);

  const actions = () => (
    <Show
      when={!reviewing()}
      fallback={
        <Button
          variant="secondary"
          icon={<ChevronLeftIcon />}
          data-testid="duplicate-check-back"
          onClick={() => setReviewing(false)}
        >
          {t('button.back-to-form')}
        </Button>
      }
    >
      <Button
        variant="secondary"
        icon={<XCircleIcon />}
        confirms="cancel"
        data-testid="dialog-button-cancel"
        onClick={props.onClose}
      >
        {t('button.cancel')}
      </Button>
      <Button
        icon={<SaveIcon />}
        confirms="plain"
        data-testid="dialog-button-ok"
        loading={busy()}
        disabled={!registry() || (onDocumentPath() && !readyDocument())}
        onClick={() => void save()}
      >
        {props.saveLabel ?? t('button.save')}
      </Button>
    </Show>
  );

  // The footer's one line (spec/patients S2 › the duplicate check).
  // Built once: the state is read only inside the conditions below, so a
  // change (other facilities answering) updates the line in place and the
  // Review and Retry buttons keep their focus.
  const doneState = createMemo(() => {
    const state = duplicates.state();
    return state.status === 'done' ? state : undefined;
  });
  const duplicateLine = (
    <Show when={duplicates.state().status !== 'off'}>
      <HStack gap="sm" align="center" wrap data-testid="duplicate-check">
        <span role="status" aria-live="polite">
          <Switch>
            <Match when={duplicates.state().status === 'checking'}>
              <HStack
                gap="sm"
                align="center"
                data-testid="duplicate-check-checking"
              >
                <Spinner sizeRem={1} />
                <Text variant="bodySmall">
                  {t('messages.checking-existing-patients')}
                </Text>
              </HStack>
            </Match>
            <Match when={doneState()}>
              {done => (
                <Show
                  when={done().matches.length > 0}
                  fallback={
                    <Show
                      when={done().central === 'pending'}
                      fallback={
                        // The tick only when every place was checked: with
                        // other facilities unreachable it's just this store.
                        <Show
                          when={done().central === 'done'}
                          fallback={
                            <Text
                              variant="bodySmall"
                              data-testid="duplicate-check-none-here"
                            >
                              {t('messages.none-at-this-store')}
                            </Text>
                          }
                        >
                          <HStack
                            gap="sm"
                            align="center"
                            data-testid="duplicate-check-none"
                          >
                            <CheckIcon />
                            <Text variant="bodySmall">
                              {t('messages.no-existing-patients')}
                            </Text>
                          </HStack>
                        </Show>
                      }
                    >
                      <HStack
                        gap="sm"
                        align="center"
                        data-testid="duplicate-check-none-here-pending"
                      >
                        <Spinner sizeRem={1} />
                        <Text variant="bodySmall">
                          {t('messages.none-here-checking-other-facilities')}
                        </Text>
                      </HStack>
                    </Show>
                  }
                >
                  <HStack gap="sm" align="center">
                    {/* A warning, not an error: it never blocks the save. The
                        line around it is already the live region. */}
                    <Alert
                      severity="warning"
                      compact
                      announce={false}
                      testId="duplicate-check-warning"
                    >
                      <HStack gap="sm" align="center">
                        <span>
                          {tPlural(
                            'messages.existing-patients-with-name',
                            done().matches.length
                          )}
                          <Show when={likelyCount(done().matches) > 0}>
                            {', '}
                            {t('messages.existing-patients-likely', {
                              count: likelyCount(done().matches),
                            })}
                          </Show>
                        </span>
                        <Show when={!reviewing()}>
                          <Button
                            variant="ghost"
                            size="small"
                            icon={<ArrowRightIcon />}
                            iconPosition="end"
                            data-testid="duplicate-check-review"
                            onClick={() => setReviewing(true)}
                          >
                            {t('button.review')}
                          </Button>
                        </Show>
                      </HStack>
                    </Alert>
                    <Show when={done().central === 'pending'}>
                      <Spinner sizeRem={1} />
                      <Text
                        variant="bodySmall"
                        data-testid="duplicate-check-central-pending"
                      >
                        {t('messages.checking-other-facilities')}
                      </Text>
                    </Show>
                  </HStack>
                </Show>
              )}
            </Match>
          </Switch>
        </span>
        <Show when={doneState()?.central === 'failed'}>
          <HStack
            gap="sm"
            align="center"
            data-testid="duplicate-check-central-failed"
          >
            <Text variant="bodySmall">
              {t('messages.other-facilities-not-checked')}
            </Text>
            <Button
              variant="ghost"
              size="small"
              icon={<RefreshIcon />}
              data-testid="duplicate-check-retry"
              onClick={() => void duplicates.retry()}
            >
              {t('button.retry')}
            </Button>
          </HStack>
        </Show>
      </HStack>
    </Show>
  );

  const matches = () => {
    const state = duplicates.state();
    return state.status === 'done' ? state.matches : [];
  };
  const reviewColumns: Column<DuplicateMatch, never>[] = [
    {
      c: {
        accessor: row =>
          row.where === 'here'
            ? t('label.this-store')
            : t('label.other-facility'),
        id: 'where',
      },
      header: () => t('label.where'),
      size: remToPx(8),
    },
    {
      c: { accessor: row => row.likely.length, id: 'likely' },
      header: () => t('label.likely-match'),
      size: remToPx(10),
      cell: info => {
        const row = info.row.original;
        return (
          <Show when={row.likely.length > 0}>
            <StatusBadge
              tone="warning"
              label={row.likely
                .map(reason =>
                  reason === 'birth-year'
                    ? t('label.same-birth-year')
                    : t('label.same-national-id')
                )
                .join(', ')}
            />
          </Show>
        );
      },
    },
    ...patientFindColumns<DuplicateMatch>(),
  ];

  return (
    <Dialog
      open={props.open}
      testId="create-patient-modal"
      title={t('label.new-patient')}
      icon={<PlusCircleIcon />}
      dismissable={!busy()}
      onClose={props.onClose}
      width="form"
      minBodyHeightRem={34}
      actionsLead={duplicateLine}
      actions={actions()}
    >
      <Show when={formError() ?? chooseError()}>
        {message => <Alert severity="error">{message()}</Alert>}
      </Show>
      <Show when={reviewing()}>
        <Stack gap="sm" data-testid="duplicate-check-matches">
          <Text variant="subtitle">{t('heading.existing-patients')}</Text>
          <Show when={matches().some(m => m.where === 'elsewhere')}>
            <Text variant="body">{t('messages.choosing-links-to-store')}</Text>
          </Show>
          <DataTable
            dialogTable
            columns={reviewColumns}
            rows={matches()}
            rowKey={r => r.id}
            loading={choosingMatch()}
            onRowClick={row => void chooseMatch(row)}
            showFullScreen={false}
            emptyMessage={t('messages.no-existing-patients')}
          />
        </Stack>
      </Show>
      {/* Kept mounted while reviewing, so nothing typed is lost. Leaving a
          field re-runs the duplicate check when what it checks changed. */}
      <div
        style={{ display: reviewing() ? 'none' : 'contents' }}
        onFocusOut={() => void duplicates.run()}
      >
        <Switch fallback={<Spinner center />}>
          <Match when={registryFailed()}>
            <Stack gap="sm">
              <Alert severity="error">
                {t('error.patient-form-settings-not-read')}
              </Alert>
              <HStack justify="start">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => void refetchRegistry()}
                  data-testid="create-patient-registry-retry"
                >
                  {t('button.retry')}
                </Button>
              </HStack>
            </Stack>
          </Match>
          <Match when={formNotLoaded()}>
            <Alert severity="error">{t('error.patient-form-not-loaded')}</Alert>
          </Match>
          <Match when={registry() && !onDocumentPath()}>
            <PatientDetailsForm
              storeId={props.storeId}
              patientId={patientId()}
              draft={draft}
              setField={setDraftField}
              errorFor={validation.errorFor}
            />
            <FormErrorSummary
              errors={validation.visible()}
              testId="create-patient-error-summary"
            />
          </Match>
          <Match when={onDocumentPath() && readyDocument()}>
            {ready => (
              <Dynamic
                component={ready().View}
                patientId={patientId()}
                form={ready().form}
                errorSummaryTestId="create-patient-error-summary"
              />
            )}
          </Match>
        </Switch>
      </div>
    </Dialog>
  );
};
