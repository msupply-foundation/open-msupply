import { generateUUID } from '../../../uuid';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  Switch,
  Match,
  type Component,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { useNavigate } from '@solidjs/router';
import { t, tPlural } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { getDateCell } from '../../../ui/elements/table/tableHelpers';
import { getBooleanCell } from '../../../ui/elements/table/BooleanCell';
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
import { createCodeTakenCheck } from '../patientCode';
import { PatientDetailsForm } from '../detail/PatientDetailsForm';
import { FetchFromCentralModal } from './FetchFromCentralModal';

// S2 — the create wizard (spec/patients FL2). A blocking modal with a three-step
// flow: ① details + search → ② the mandatory local + central duplicate check →
// ③ the full plain-path details form. A fresh patient identifier is minted when
// the modal opens (AC-C5), so a duplicate-id rejection is unreachable. The step
// rail is a section-local presentational stepper — the "wizard stepper" role is
// not in the component registry (see the implementation flags).

type Step = 1 | 2 | 3;

interface SearchForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string;
  phone: string;
}

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

export interface CreatePatientModalProps {
  open: boolean;
  storeId: string;
  onClose: () => void;
  /**
   * When set, the modal is being used to create-and-return a patient for
   * another surface (e.g. the prescription create dialog — spec/prescriptions
   * AC-C5): on a successful create it calls this with the new patient and
   * closes, INSTEAD of navigating to the patient detail. Omit for the
   * standalone list flow (navigate to the new patient).
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

  // Duplicate-code check (spec/patients § generating a code), run on the save
  // attempt below. No saved code to compare against while creating, so every
  // non-empty code is checked.
  const codeCheck = createCodeTakenCheck({
    storeId: () => props.storeId,
    code: () => draft.code,
    savedCode: () => '',
    patientId: () => undefined,
  });

  // Details-step validation (AC-C3): required errors stay quiet until the first
  // Save attempt, then surface per field and as the summary below the form.
  const validation = createFormValidation(() =>
    patientFieldErrors(draft, codeCheck.taken())
  );

  // Mint a fresh identifier + reset the flow each time the modal opens (AC-C5).
  createEffect(() => {
    if (props.open) {
      setStep(1);
      setPatientId(generateUUID());
      setSearch(emptySearch());
      setDraft(emptyDraft());
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

  // Local + central duplicate check (AC-C1/S2). Central honours only code /
  // first / last / dob (AC-S3); central-unreachable is decoded to a banner.
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

  // De-dup central against local (AC-S2): a central candidate already present
  // locally is not shown a second time.
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
  // opens the fetch modal. Bound to the whole row as well as its trailing icon —
  // the step's own instruction (messages.patients-create) tells the user to
  // "click an existing patient below", so the row itself has to be the target.
  const openMatch = (row: MatchRow) =>
    row.kind === 'central' ? openFetch(row) : openExisting(row.id);

  // Advance to the details step, seeding the plain form from the entered search
  // details (spec/patients step ③).
  const advanceToDetails = () => {
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

  const save = async () => {
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
    // Create-and-return (AC-C5): hand the new patient back to the caller and
    // close, rather than navigating away to its detail.
    if (props.onCreated) {
      const name = [draft.lastName, draft.firstName].filter(Boolean).join(', ');
      props.onClose();
      props.onCreated(minimalPatientOption(outcome.id, name));
      return;
    }
    props.onClose();
    navigate(`/${props.storeId}/dispensary/patients/${outcome.id}`);
  };

  const resultColumns = (): Column<MatchRow, never>[] => [
    { c: { key: 'code' }, header: () => t('label.patient-id') },
    { c: { key: 'code2' }, header: () => t('label.patient-nuic') },
    { c: { key: 'firstName' }, header: () => t('label.first-name') },
    { c: { key: 'lastName' }, header: () => t('label.last-name') },
    {
      c: { key: 'dateOfBirth' },
      header: () => t('label.date-of-birth'),
      ...getDateCell(),
    },
    {
      c: {
        accessor: (row: MatchRow) =>
          row.gender ? genderLabel(row.gender) : '',
        id: 'gender',
      },
      header: () => t('label.gender'),
    },
    {
      c: { key: 'isDeceased' },
      header: () => t('label.deceased'),
      ...getBooleanCell({ display: 'yesNo' }),
    },
    {
      c: { id: 'action' },
      header: () => '',
      // The trailing icon does what the row does — it is here to distinguish a
      // central-only candidate (download → retrieve) from a local match (home →
      // open). Its click must not ALSO bubble to the row handler.
      cell: info => {
        const row = info.row.original;
        const open = (event: MouseEvent) => {
          event.stopPropagation();
          openMatch(row);
        };
        return row.kind === 'central' ? (
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
        );
      },
    },
  ];

  const stepTitle = () =>
    step() === 1
      ? t('label.create-patient')
      : step() === 2
        ? t('label.search-results')
        : t('label.patient-details');

  const actions = () => (
    <Switch>
      <Match when={step() === 1}>
        <Button
          variant="secondary"
          icon={<XCircleIcon />}
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        >
          {t('button.cancel')}
        </Button>
        <Button
          icon={<SearchIcon />}
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
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        >
          {t('button.cancel')}
        </Button>
        <Button
          icon={<PlusCircleIcon />}
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
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        >
          {t('button.cancel')}
        </Button>
        <Button
          icon={<SaveIcon />}
          data-testid="dialog-button-ok"
          loading={saving()}
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
        dismissable={!searching() && !saving()}
        onClose={props.onClose}
        widthRem={step() === 2 ? 96 : step() === 3 ? 56 : 44}
        minBodyHeightRem={34}
        actions={actions()}
      >
        {/* Section-local wizard stepper (registry-gap role — see flags). */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            'margin-block-end': '1rem',
          }}
          aria-label={stepTitle()}
        >
          <For
            each={
              [
                [1, t('label.create-patient')],
                [2, t('label.search-results')],
                [3, t('label.patient-details')],
              ] as const
            }
          >
            {([n, label]) => (
              <span
                aria-current={step() === n ? 'step' : undefined}
                style={{
                  'font-weight':
                    step() === n ? 'var(--weight-bold)' : undefined,
                  opacity: step() === n ? undefined : '0.6',
                }}
              >
                {n}. {label}
              </span>
            )}
          </For>
        </div>

        <Switch>
          <Match when={step() === 1}>
            <Alert severity="info">{t('messages.patients-search')}</Alert>
            <FormSection title={t('heading.patient-details')}>
              <TextField
                label={t('label.first-name')}
                width="full"
                required
                value={search.firstName}
                onInput={e => setSearch('firstName', e.currentTarget.value)}
              />
              <TextField
                label={t('label.last-name')}
                width="full"
                required
                value={search.lastName}
                onInput={e => setSearch('lastName', e.currentTarget.value)}
              />
              <DateField
                label={t('label.date-of-birth')}
                width="full"
                max={localTodayIso()}
                value={search.dateOfBirth}
                onChange={value => setSearch('dateOfBirth', value)}
              />
              <Combobox<GenderOption>
                label={t('label.gender')}
                width="full"
                items={genderOptions()}
                itemToString={o => o.label}
                itemToValue={o => o.value}
                value={search.gender ?? undefined}
                onChange={o => setSearch('gender', o?.value ?? null)}
              />
              <TextField
                label={t('label.address')}
                width="full"
                value={search.address}
                onInput={e => setSearch('address', e.currentTarget.value)}
              />
              <TextField
                label={t('label.phone')}
                width="full"
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
                <Alert severity="warning">
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
                  showFullScreen={false}
                />
              </Show>
            </Show>
          </Match>

          <Match when={step() === 3}>
            <Show when={saveError()}>
              <Alert severity="error">{saveError()}</Alert>
            </Show>
            <PatientDetailsForm
              storeId={props.storeId}
              patientId={patientId()}
              draft={draft}
              setField={setDraftField}
              errorFor={validation.errorFor}
              creating
            />
            <FormErrorSummary
              errors={validation.visible()}
              testId="create-patient-error-summary"
            />
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
