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

  // Details-step validation (AC-C3): required errors stay quiet until the first
  // Save attempt, then surface per field and as the summary below the form.
  const validation = createFormValidation(() => patientFieldErrors(draft));

  // Mint a fresh identifier + reset the flow each time the modal opens (AC-C5).
  createEffect(() => {
    if (props.open) {
      setStep(1);
      setPatientId(crypto.randomUUID());
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
    props.onClose();
    navigate(`/${props.storeId}/dispensary/patients/${outcome.id}`);
  };

  const resultColumns = (): Column<MatchRow, never>[] => [
    { c: { key: 'code' }, header: t('label.patient-id') },
    { c: { key: 'code2' }, header: t('label.patient-nuic') },
    { c: { key: 'firstName' }, header: t('label.first-name') },
    { c: { key: 'lastName' }, header: t('label.last-name') },
    {
      c: { key: 'dateOfBirth' },
      header: t('label.date-of-birth'),
      ...getDateCell(),
    },
    {
      c: {
        accessor: (row: MatchRow) =>
          row.gender ? genderLabel(row.gender) : '',
        id: 'gender',
      },
      header: t('label.gender'),
    },
    {
      c: { key: 'isDeceased' },
      header: t('label.deceased'),
      ...getBooleanCell({ display: 'yesNo' }),
    },
    {
      c: { id: 'action' },
      header: '',
      cell: info => {
        const row = info.row.original;
        return row.kind === 'central' ? (
          <IconButton
            icon={<DownloadIcon />}
            label={t('button.ok')}
            onClick={() => openFetch(row)}
          />
        ) : (
          <IconButton
            icon={<HomeIcon />}
            label={t('label.details')}
            onClick={() => openExisting(row.id)}
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
        widthRem={step() === 3 ? 56 : 44}
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
                max={new Date().toISOString().slice(0, 10)}
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
                  emptyMessage={t('messages.no-matching-patients')}
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
              draft={draft}
              setField={setDraftField}
              errorFor={validation.errorFor}
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
