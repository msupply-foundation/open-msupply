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
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { getCellDefinition } from '../../../ui/elements/table/tableHelpers';
import { getBooleanCell } from '../../../ui/elements/table/BooleanCell';
import { remToPx } from '../../../ui/utils/rem';
import { ProgressList } from '../../../ui/sync/ProgressList';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { FormErrorSummary } from '../../../ui/layout/Form/FormErrorSummary';
import { createFormValidation } from '../../../ui/layout/Form/formValidation';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import {
  DownloadIcon,
  HomeIcon,
  PlusCircleIcon,
  SaveIcon,
  SearchIcon,
  XCircleIcon,
} from '../../../ui/icons';
import {
  searchLocalPatients,
  searchCentralPatients,
  genderOptions,
  genderLabel,
  minimalPatientOption,
  type Gender,
  type GenderOption,
  type CentralPatient,
  type PatientOption,
} from '../../../domain/patient';
import { runInsertPatient } from '../patientApi';
import {
  emptyDraft,
  patientFieldErrors,
  toInsertInput,
  type PatientDraft,
} from '../detail/patientEdit';
import { createCodeTakenCheck } from '../../../domain/patient/patientCode';
import type { Patient } from '../../../plugin-sdk/documents';
import { gated } from '../../../api/gated';
import { PatientDetailsForm } from '../detail/PatientDetailsForm';
import {
  seedNewPatientDocument,
  type NewPatientFields,
} from '../detail/patientDocumentSeed';
import { fetchPatientRegistry } from '../detail/programs/programsApi';
import { documentFormFor } from '../../../plugins/documentFormSlot';
import { FetchFromCentralModal } from './FetchFromCentralModal';

// S2 — the create wizard (spec/patients). A blocking modal with a
// three-step flow: ① details + search → ② the mandatory local + central
// duplicate check → ③ the full details form, on the store's persistence path:
// the plain-path form over the patient record, or, where the store has a
// Patient registry entry, its patient form over the new patient's first
// document (spec/patients › effects of creation). A fresh patient identifier
// is minted when the modal opens (OMS-REG-DIS-01.4/.7/.32), so a duplicate-id
// rejection is unreachable. The step rail is a section-local
// presentational stepper — the "wizard stepper" role is not in the component
// registry (see the implementation flags).

type Step = 1 | 2 | 3;

type SearchForm = NewPatientFields;

// A unified duplicate-check row: a local patient or a central-only candidate.
interface MatchRow {
  kind: 'local' | 'central';
  id: string;
  code: string;
  code2: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  isDeceased: boolean;
}

const emptySearch = (): SearchForm => ({
  firstName: '',
  lastName: '',
  dateOfBirth: null,
  gender: null,
  address: '',
  phone: '',
});

// The document path's form host and its view, loaded the first time step ③
// takes that path rather than with this module: the startup bundle reaches
// the wizard through the dashboard's new prescription request, and the form
// host must stay out of it (vite/lazyChunkGuard.ts). One load, shared by
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
}

export const CreatePatientModal: Component<CreatePatientModalProps> = props => {
  const navigate = useNavigate();
  const [step, setStep] = createSignal<Step>(1);
  const [patientId, setPatientId] = createSignal('');
  const [search, setSearch] = createStore<SearchForm>(emptySearch());
  const [draft, setDraft] = createStore<PatientDraft>(emptyDraft());
  const [localMatches, setLocalMatches] = createSignal<PatientOption[]>([]);
  const [centralMatches, setCentralMatches] = createSignal<CentralPatient[]>(
    []
  );
  const [centralUnreachable, setCentralUnreachable] = createSignal(false);
  const [searching, setSearching] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');
  const [fetchCandidate, setFetchCandidate] = createSignal<CentralPatient>();
  const [fetchOpen, setFetchOpen] = createSignal(false);

  // The store's Patient registry entry decides step ③'s path, as it decides
  // the Details tab's (patientDetails.ts). Read each time the modal opens,
  // non-suspending, since the modal is already open.
  const [registryData] = createResource(
    () => (props.open ? props.storeId : undefined),
    fetchPatientRegistry
  );
  const registry = () => gated(registryData);
  const onDocumentPath = () => registry()?.entry !== undefined;

  // The document path's step ③: the new patient's first document, seeded
  // from step ① when the wizard reaches it, the way the form that edits it
  // needs (seedNewPatientDocument): a plugin's patient form, or the host's
  // default one.
  const [seedFields, setSeedFields] = createSignal<NewPatientFields>();
  const pluginForm = createMemo(() => {
    const type = registry()?.entry?.documentType;
    return (
      type !== undefined &&
      documentFormFor('patient.form', type).occupant !== undefined
    );
  });
  const documentSeed = createMemo((): Patient | undefined => {
    const fields = seedFields();
    return fields
      ? seedNewPatientDocument(patientId(), fields, pluginForm())
      : undefined;
  });
  const [documentPath, setDocumentPath] = createSignal(documentPathModules);
  createEffect(() => {
    if (onDocumentPath() && !documentPath()) {
      void loadDocumentPath().then(modules => setDocumentPath(() => modules));
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

  // Details-step validation (OMS-REG-DIS-01.5/.6/.30): required errors stay
  // quiet until the first Save attempt, then surface per field and as the
  // summary below the form.
  const validation = createFormValidation(() =>
    patientFieldErrors(draft, codeCheck.taken())
  );

  // Mint a fresh identifier + reset the flow each time the modal opens
  // (OMS-REG-DIS-01.4/.7/.32).
  createEffect(() => {
    if (props.open) {
      setStep(1);
      setPatientId(generateUUID());
      setSearch(emptySearch());
      setDraft(emptyDraft());
      setSeedFields(undefined);
      setLocalMatches([]);
      setCentralMatches([]);
      setCentralUnreachable(false);
      setSaveError('');
      validation.reset();
    }
  });

  const setDraftField = <K extends keyof PatientDraft>(
    key: K,
    value: PatientDraft[K]
  ) => setDraft(key, value);

  const canSearch = () =>
    search.firstName.trim() !== '' && search.lastName.trim() !== '';

  // Local + central duplicate check (OMS-REG-DIS-01.8–.10/.28/.38). Central
  // honours only code / first / last / dob (OMS-REG-DIS-01.39);
  // central-unreachable is decoded to a banner.
  const runSearch = async () => {
    setSearching(true);
    setCentralUnreachable(false);
    const [local, central] = await Promise.all([
      searchLocalPatients(props.storeId, {
        firstName: search.firstName || null,
        lastName: search.lastName || null,
        dateOfBirth: search.dateOfBirth,
        gender: search.gender,
      }),
      searchCentralPatients(props.storeId, {
        firstName: search.firstName || null,
        lastName: search.lastName || null,
        dateOfBirth: search.dateOfBirth,
      }),
    ]);
    setLocalMatches(local ?? []);
    if (central.kind === 'ok') setCentralMatches(central.nodes);
    else {
      setCentralMatches([]);
      if (central.kind === 'unreachable') setCentralUnreachable(true);
    }
    setSearching(false);
    setStep(2);
  };

  // De-dup central against local (OMS-REG-DIS-01.9/.10/.38): a central
  // candidate already present locally is not shown a second time.
  const matches = createMemo<MatchRow[]>(() => {
    const localIds = new Set(localMatches().map(p => p.id));
    const local: MatchRow[] = localMatches().map(p => ({
      kind: 'local',
      id: p.id,
      code: p.code,
      code2: p.code2,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      isDeceased: p.isDeceased,
    }));
    const central: MatchRow[] = centralMatches()
      .filter(c => !localIds.has(c.id))
      .map(c => ({
        kind: 'central',
        id: c.id,
        code: c.code,
        code2: c.code2,
        firstName: c.firstName,
        lastName: c.lastName,
        dateOfBirth: c.dateOfBirth,
        gender: c.gender,
        isDeceased: c.isDeceased,
      }));
    return [...local, ...central];
  });

  const openExisting = (id: string) => {
    props.onClose();
    navigate(`/${props.storeId}/dispensary/patients/${id}`);
  };

  const openFetch = (row: MatchRow) => {
    const candidate = centralMatches().find(c => c.id === row.id);
    if (candidate) {
      setFetchCandidate(candidate);
      setFetchOpen(true);
    }
  };

  // What a match row DOES: a local match opens that patient, a central-only one
  // opens the fetch modal. Bound to the whole row as well as its trailing icon
  // — the step's own instruction (messages.patients-create) tells the user to
  // "click an existing patient below", so the row itself has to be the target.
  const openMatch = (row: MatchRow) =>
    row.kind === 'central' ? openFetch(row) : openExisting(row.id);

  // Advance to the details step, seeding its form from the entered search
  // details (spec/patients step ③): the plain form's draft, and the new
  // document's seed for the document path.
  const advanceToDetails = () => {
    setSeedFields({ ...search });
    setDraft({
      ...emptyDraft(),
      firstName: search.firstName,
      lastName: search.lastName,
      gender: search.gender,
      dateOfBirth: search.dateOfBirth,
      address1: search.address,
      phone: search.phone,
    });
    setStep(3);
  };

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

  const busy = () => saving() || (newDocument()?.saving() ?? false);
  const stepThreeError = () =>
    onDocumentPath() ? newDocument()?.saveError() : saveError();
  // Step ③'s document form, once its modules have loaded and its form is
  // ready to edit.
  const readyDocument = () => {
    const View = documentPath()?.View;
    const form = newDocument()?.form;
    return View && form?.status() === 'ready' ? { View, form } : undefined;
  };

  // Cell-type presets carry the rendering AND the width
  // (ui/docs/CELL_TYPES.md). Deceased reads as a word here, not the list's
  // flag: this table is scanned to judge whether a candidate IS the patient,
  // and it holds a handful of rows.
  const resultColumns = (): Column<MatchRow, never>[] => [
    {
      c: { key: 'code' },
      header: () => t('label.patient-id'),
      ...getCellDefinition('code'),
    },
    {
      c: { key: 'code2' },
      header: () => t('label.patient-nuic'),
      ...getCellDefinition('code2'),
    },
    {
      c: { key: 'firstName' },
      header: () => t('label.first-name'),
      ...getCellDefinition('firstName'),
    },
    {
      c: { key: 'lastName' },
      header: () => t('label.last-name'),
      ...getCellDefinition('lastName'),
    },
    {
      c: { key: 'dateOfBirth' },
      header: () => t('label.date-of-birth'),
      ...getCellDefinition('dateOfBirth'),
    },
    {
      c: {
        accessor: (row: MatchRow) =>
          row.gender ? genderLabel(row.gender) : '',
        id: 'gender',
      },
      header: () => t('label.gender'),
      ...getCellDefinition('gender'),
    },
    {
      c: { key: 'isDeceased' },
      header: () => t('label.deceased'),
      ...getBooleanCell({ display: 'yesNo' }),
      // Yes/No text under the header word, which is the wider of the two.
      size: remToPx(5.5),
    },
    {
      c: { id: 'action' },
      header: () => '',
      // One icon button, never grows.
      size: remToPx(3),
      maxSize: remToPx(3),
      // The trailing icon does what the row does — it is here to distinguish a
      // central-only candidate (download → retrieve) from a local match (home →
      // open). Its click must not ALSO bubble to the row handler.
      cell: info => {
        const row = info.row.original;
        const open = (event: MouseEvent) => {
          event.stopPropagation();
          openMatch(row);
        };
        return (
          <>
            {row.kind === 'central' ? (
              <IconButton
                icon={<DownloadIcon />}
                label={t('messages.click-to-fetch')}
                onClick={open}
              />
            ) : (
              <IconButton
                icon={<HomeIcon />}
                label={t('label.details')}
                onClick={open}
              />
            )}
          </>
        );
      },
    },
  ];

  const actions = () => (
    <Switch>
      <Match when={step() === 1}>
        <Button
          variant="secondary"
          icon={<XCircleIcon />}
          confirms="cancel"
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        >
          {t('button.cancel')}
        </Button>
        {/* Each step's forward action is that step's confirm, so Enter advances
            the wizard from anywhere in its form (spec/keyboard KB-E2). */}
        <Button
          icon={<SearchIcon />}
          confirms="plain"
          data-testid="dialog-button-ok"
          loading={searching()}
          disabled={!canSearch()}
          onClick={() => void runSearch()}
        >
          {t('messages.search')}
        </Button>
      </Match>
      <Match when={step() === 2}>
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
          icon={<PlusCircleIcon />}
          confirms="plain"
          data-testid="create-new-patient-button"
          onClick={advanceToDetails}
        >
          {t('button.create-new-patient')}
        </Button>
      </Match>
      <Match when={step() === 3}>
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
          disabled={!registry()}
          onClick={() => void save()}
        >
          {t('button.save')}
        </Button>
      </Match>
    </Switch>
  );

  return (
    <>
      <Dialog
        open={props.open}
        testId="create-patient-modal"
        title={t('label.create-patient')}
        icon={<PlusCircleIcon />}
        dismissable={!searching() && !busy()}
        onClose={props.onClose}
        // ONE width for every step — the shared form measure, so the dialog is
        // a steady box the flow moves through rather than one that jumps wider
        // on the results step and back again. The results table fits: its
        // columns' width presets total ~51rem (Carl, 2026-07-31).
        width="form"
        minBodyHeightRem={34}
        actions={actions()}
      >
        {/* The wizard's step rail — the shared determinate progress list, the
            same role the reference app's WizardStepper fills with its one
            horizontal stepper. A step is finished once the flow has moved past
            it, so the step you are on reads as in-progress and the ones behind
            it as done. It needs no measure wrapper (the customer-return wizards
            cap theirs): this dialog is already the form measure, so the rail can
            divide the body's full width between its three steps. */}
        <ProgressList
          variant="secondary"
          steps={[
            {
              label: t('label.create-patient'),
              started: true,
              finished: step() > 1,
            },
            {
              label: t('label.search-results'),
              started: step() >= 2,
              finished: step() > 2,
            },
            {
              label: t('label.patient-details'),
              started: step() >= 3,
              finished: false,
            },
          ]}
        />

        <Switch>
          <Match when={step() === 1}>
            <Alert severity="info">{t('messages.patients-search')}</Alert>
            <FormSection title={t('heading.patient-details')}>
              <TextField
                label={t('label.first-name')}
                required
                data-testid="input-firstName"
                value={search.firstName}
                onInput={e => setSearch('firstName', e.currentTarget.value)}
              />
              <TextField
                label={t('label.last-name')}
                required
                data-testid="input-lastName"
                value={search.lastName}
                onInput={e => setSearch('lastName', e.currentTarget.value)}
              />
              <DateField
                label={t('label.date-of-birth')}
                max={localTodayIso()}
                value={search.dateOfBirth}
                onChange={value => setSearch('dateOfBirth', value)}
              />
              <Combobox<GenderOption>
                label={t('label.gender')}
                items={genderOptions()}
                itemToString={o => o.label}
                itemToValue={o => o.value}
                value={search.gender ?? undefined}
                onChange={o => setSearch('gender', o?.value ?? null)}
              />
              <TextField
                label={t('label.address')}
                value={search.address}
                onInput={e => setSearch('address', e.currentTarget.value)}
              />
              <TextField
                label={t('label.phone')}
                value={search.phone}
                onInput={e => setSearch('phone', e.currentTarget.value)}
              />
            </FormSection>
          </Match>

          <Match when={step() === 2}>
            <Show when={searching()}>
              <Spinner center />
            </Show>
            <Show when={!searching()}>
              <Show
                when={matches().length > 0}
                fallback={
                  <Alert severity="info">
                    {t('messages.no-matching-patients')}
                  </Alert>
                }
              >
                <Alert severity="info">
                  {tPlural('messages.patients-found', matches().length)}
                </Alert>
                <Alert severity="neutral">
                  {t('messages.patients-create')}
                </Alert>
              </Show>
              <Show when={centralUnreachable()}>
                <Alert severity="warning" testId="central-search-error">
                  {t('messages.failed-to-reach-central')}{' '}
                  <Button
                    variant="secondary"
                    icon={<SearchIcon />}
                    onClick={() => void runSearch()}
                  >
                    {t('button.retry')}
                  </Button>
                </Alert>
              </Show>
              <Show when={matches().length > 0}>
                <DataTable
                  columns={resultColumns()}
                  rows={matches()}
                  rowKey={row => `${row.kind}:${row.id}`}
                  onRowClick={openMatch}
                  showFullScreen={false}
                  emptyMessage={t('messages.no-matching-patients')}
                />
              </Show>
            </Show>
          </Match>

          <Match when={step() === 3}>
            <Show when={stepThreeError()}>
              <Alert severity="error">{stepThreeError()}</Alert>
            </Show>
            <Switch fallback={<Spinner center />}>
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
          </Match>
        </Switch>
      </Dialog>

      <FetchFromCentralModal
        open={fetchOpen()}
        storeId={props.storeId}
        candidate={fetchCandidate()}
        onClose={() => setFetchOpen(false)}
        onViewPatient={id => {
          setFetchOpen(false);
          openExisting(id);
        }}
      />
    </>
  );
};
