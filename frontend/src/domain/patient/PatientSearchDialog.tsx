import { createEffect, createSignal, on, Show, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import { isCentralServer } from '../../api/serverInfo';
import { hasPermission } from '../../store/storeContext';
import { t, localeDateFormat } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { Button } from '../../ui/elements/buttons/Button';
import { CancelButton } from '../../ui/elements/buttons/StandardButtons';
import { TextField } from '../../ui/elements/inputs/TextField';
import { FormRow } from '../../ui/layout/Form/FormRow';
import { Stack } from '../../ui/layout/Stack/Stack';
import { HStack } from '../../ui/layout/Stack/HStack';
import { Text } from '../../ui/elements/typography/Text';
import { DataTable } from '../../ui/elements/table/DataTable';
import { createDebounced } from '../../ui/utils/createDebounced';
import { createFocusTarget } from '../../ui/utils/createFocusTarget';
import { smoothScrollOptions } from '../../ui/utils/createMediaQuery';
import { PlusCircleIcon, RefreshIcon, SearchIcon } from '../../ui/icons';
import { parseDobSearch } from './dobSearch';
import { linkPatientToStore } from './patientResource';
import {
  FIND_LIMIT,
  findCentralPatients,
  findPatients,
  fold,
  hasTerms,
  recentPatients,
  type FindTerms,
  type PatientFindRow,
} from './patientFind';
import { patientFindColumns } from './patientFindColumns';
import styles from './PatientSearchDialog.module.css';

// What the user has typed, one entry per search field. Date of birth is text:
// a year, a month and year, or a full date (dobSearch.ts).
type SearchFields = {
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  id: string;
};

const EMPTY_FIELDS: SearchFields = {
  lastName: '',
  firstName: '',
  dateOfBirth: '',
  id: '',
};

const RECENT_COUNT = 10;

// One page of results. Pages have no total: `more` says there's a next.
type Page = { rows: PatientFindRow[]; offset: number; more: boolean };

// While a search runs, the page it replaces stays on screen (`previous`), as a
// table keeps its rows through a refetch, with the table's own spinner over it.
type LocalState =
  | { kind: 'idle' }
  | { kind: 'searching'; previous?: Page }
  | ({ kind: 'done' } & Page);

// Other facilities: searched automatically when nothing matches here, else on
// request. They're the central server, which can be slow or out of reach.
// `unreachable` with `skipped`: not asked, as it was out of reach moments ago;
// `slow`: it was reached but didn't answer in time, which pauses it the same.
type CentralState =
  | { kind: 'idle' }
  | { kind: 'searching'; previous?: Page }
  | ({ kind: 'done' } & Page)
  | { kind: 'unreachable'; previous?: Page; skipped?: boolean; slow?: boolean };

// After central is out of reach, searches stop asking it by themselves for this
// long (each try can take seconds to fail); Retry or the button still ask.
const CENTRAL_PAUSE_MS = 60_000;

const pageOf = (state: LocalState | CentralState): Page | undefined =>
  state.kind === 'done'
    ? state
    : state.kind === 'idle'
      ? undefined
      : state.previous;

// Choosing a patient from another facility links them to this store first.
type LinkState =
  | { kind: 'idle' }
  | { kind: 'linking'; patient: PatientFindRow }
  | { kind: 'failed'; patient: PatientFindRow; message: string };

/** What the create form starts from (spec/patients S2 step ②). */
export type NewPatientSeed = {
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
};

export interface PatientSearchDialogProps {
  open: boolean;
  storeId: string;
  title: string;
  onClose: () => void;
  /**
   * A patient was chosen — one of this site's, or one from another facility,
   * already added to this store. The caller decides what choosing does; a
   * returned message is shown in the dialog, which stays open.
   */
  onChoose: (patient: PatientFindRow) => Promise<string | undefined> | void;
  /** When set, **New patient** opens the create form from what was typed. */
  onCreatePatient?: (seed: NewPatientSeed) => void;
  /** List this store's recent patients before anything is typed. */
  showRecent?: boolean;
  /** The patient being replaced (Change on a record), shown as a reminder. */
  changingFrom?: string;
  /** A failure from the caller's own action (e.g. after creating a patient). */
  error?: string;
  /**
   * The caller is acting on a patient chosen elsewhere (one just created):
   * the dialog holds still, as while choosing, until it's done.
   */
  busy?: boolean;
}

/**
 * Finding a patient (#631 spike; spec/patients S2 step ①). One field per
 * thing a dispenser knows about the patient, searched once typing pauses or
 * straight away on Enter. Other facilities are searched automatically when
 * nothing matches here, and on request otherwise.
 */
export const PatientSearchDialog = (
  props: PatientSearchDialogProps
): JSX.Element => {
  const [fields, setFields] = createStore<SearchFields>({ ...EMPTY_FIELDS });
  const [local, setLocal] = createSignal<LocalState>({ kind: 'idle' });
  const [central, setCentral] = createSignal<CentralState>({ kind: 'idle' });
  const [link, setLink] = createSignal<LinkState>({ kind: 'idle' });
  const [recent, setRecent] = createSignal<PatientFindRow[]>([]);
  const [choosing, setChoosing] = createSignal(false);
  const [chooseError, setChooseError] = createSignal<string>();
  // The terms the shown results are for. Searches overlap when typing
  // resumes, so each reply checks it is still the latest before showing.
  const [searched, setSearched] = createSignal<FindTerms>();
  let searchToken = 0;
  let centralToken = 0;
  // A link to this store is answered after the dialog may have been
  // cancelled or reopened; choosing goes ahead only if it's still the same.
  let chooseToken = 0;
  // When central was last found out of reach; 0 once it answers.
  let centralDownAt = 0;
  // Whether that was central answering too slowly rather than out of reach.
  let centralSlow = false;

  const dob = () => parseDobSearch(fields.dateOfBirth, localeDateFormat());
  const dobError = () =>
    dob() === 'invalid' ? t('error.date-of-birth-search') : undefined;
  const terms = (): FindTerms => {
    const parsed = dob();
    return {
      lastName: fields.lastName,
      firstName: fields.firstName,
      dob: parsed && parsed !== 'invalid' ? parsed : undefined,
      id: fields.id,
    };
  };

  const busy = () => !!props.busy || choosing() || link().kind === 'linking';
  // Closing is held only while the caller acts: what it sent can't be called
  // back. A link can be abandoned — the patient stays linked, unchosen.
  const holdsClose = () => !!props.busy || choosing();

  const searchOtherFacilities = async (forTerms: FindTerms, offset = 0) => {
    const token = ++centralToken;
    setCentral({ kind: 'searching', previous: pageOf(central()) });
    const outcome = await findCentralPatients(props.storeId, forTerms, offset);
    if (token !== centralToken) return;
    const down = outcome.kind === 'unreachable' || outcome.kind === 'slow';
    centralDownAt = down ? Date.now() : 0;
    centralSlow = outcome.kind === 'slow';
    if (outcome.kind === 'ok')
      setCentral({
        kind: 'done',
        rows: outcome.rows,
        offset,
        more: outcome.more,
      });
    else if (down)
      setCentral({
        kind: 'unreachable',
        previous: pageOf(central()),
        slow: centralSlow,
      });
    else setCentral({ kind: 'idle' });
  };

  // An exact patient ID (a scanned card) that only one living patient has:
  // pressing Enter chooses them straight away.
  const exactIdMatch = (rows: PatientFindRow[], id: string) => {
    const wanted = fold(id);
    if (!wanted) return undefined;
    const exact = rows.filter(
      r => fold(r.code) === wanted || (r.code2 && fold(r.code2) === wanted)
    );
    const [only] = exact;
    return exact.length === 1 && !only.isDeceased ? only : undefined;
  };

  const runSearch = async (fromEnter: boolean) => {
    const forTerms = terms();
    const token = ++searchToken;
    // Other facilities' results stay up until this store's are in: they go if
    // there are matches here, and are searched again if there aren't. A reply
    // still due for the old terms is dropped.
    centralToken++;
    setChooseError(undefined);
    if (!hasTerms(forTerms)) {
      setSearched(undefined);
      setLocal({ kind: 'idle' });
      setCentral({ kind: 'idle' });
      return;
    }
    setSearched(forTerms);
    setLocal({ kind: 'searching', previous: pageOf(local()) });
    const result = await findPatients(props.storeId, forTerms);
    if (token !== searchToken) return;
    const rows = result?.rows ?? [];
    setLocal({ kind: 'done', rows, offset: 0, more: result?.more ?? false });
    if (rows.length > 0 || isCentralServer()) setCentral({ kind: 'idle' });
    if (fromEnter) {
      const match = exactIdMatch(rows, forTerms.id);
      if (match) return void choose(match);
    }
    if (rows.length === 0 && !isCentralServer()) {
      if (Date.now() - centralDownAt < CENTRAL_PAUSE_MS)
        setCentral({ kind: 'unreachable', skipped: true, slow: centralSlow });
      else void searchOtherFacilities(forTerms);
    }
  };

  // Another page of this store's results, for the terms already searched.
  const goToLocalPage = async (offset: number) => {
    const forTerms = searched();
    if (!forTerms) return;
    const token = ++searchToken;
    setLocal({ kind: 'searching', previous: pageOf(local()) });
    const result = await findPatients(props.storeId, forTerms, offset);
    if (token !== searchToken) return;
    setLocal({
      kind: 'done',
      rows: result?.rows ?? [],
      offset,
      more: result?.more ?? false,
    });
  };

  const search = createDebounced(() => void runSearch(false), 400);
  const setField = <K extends keyof SearchFields>(key: K, value: string) => {
    setFields(key, value);
    search();
  };
  const onFieldKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    search.cancel();
    void runSearch(true);
  };

  // Hands the patient to the caller (e.g. creating the dispensing record).
  // Cancel is held while it runs: what's been sent can't be called back.
  const act = async (patient: PatientFindRow) => {
    setChoosing(true);
    setChooseError(undefined);
    const message = await props.onChoose(patient);
    setChoosing(false);
    if (message) setChooseError(message);
  };

  const choose = async (patient: PatientFindRow) => {
    if (busy()) return;
    // Choosing someone here instead of retrying a failed link drops it.
    setLink({ kind: 'idle' });
    await act(patient);
  };

  const chooseCentral = async (patient: PatientFindRow) => {
    if (busy()) return;
    const token = ++chooseToken;
    setLink({ kind: 'linking', patient });
    const outcome = await linkPatientToStore(props.storeId, patient.id);
    // Cancelled while linking: the patient stays linked to this store, which
    // is harmless, but choosing them doesn't go ahead.
    if (token !== chooseToken) return;
    if (outcome.kind === 'ok') {
      // "Getting patient…" stays up while the caller acts on them.
      await act(patient);
      setLink({ kind: 'idle' });
      return;
    }
    setLink(
      outcome.kind === 'unreachable'
        ? {
            kind: 'failed',
            patient,
            message: outcome.message || t('messages.failed-to-reach-central'),
          }
        : { kind: 'idle' }
    );
  };

  // Every opening starts from a blank search.
  createEffect(
    on(
      () => props.open,
      open => {
        if (!open) return;
        searchToken++;
        centralToken++;
        chooseToken++;
        centralDownAt = 0;
        setFields({ ...EMPTY_FIELDS });
        setSearched(undefined);
        setLocal({ kind: 'idle' });
        setCentral({ kind: 'idle' });
        setLink({ kind: 'idle' });
        setChooseError(undefined);
        // Recent patients come from dispensing records, so only for a user
        // who can read them: without PRESCRIPTION_QUERY the read is refused
        // and raises the global permission-denied modal (as #637), e.g. for a
        // prescriber opening the search from a prescription request.
        if (props.showRecent && hasPermission('PRESCRIPTION_QUERY'))
          void recentPatients(props.storeId, RECENT_COUNT).then(setRecent);
      }
    )
  );

  const close = () => {
    search.cancel();
    // A search still answering (an Enter on a scanned ID would choose from
    // it) or a link still running is dropped.
    searchToken++;
    centralToken++;
    chooseToken++;
    props.onClose();
  };

  const createPatient = () => {
    const parsed = dob();
    props.onCreatePatient?.({
      lastName: fields.lastName.trim(),
      firstName: fields.firstName.trim(),
      dateOfBirth:
        parsed && parsed !== 'invalid' && parsed.exact ? parsed.from : null,
    });
  };

  const localRows = () => pageOf(local())?.rows ?? [];
  // A patient from this store or the recent list is being acted on (one from
  // another facility shows "Getting patient…" instead).
  const choosingHere = () => choosing() && link().kind === 'idle';
  const failedLink = () => {
    const l = link();
    return l.kind === 'failed' ? l : undefined;
  };
  const centralMessage = () => {
    const c = central();
    if (c.kind !== 'unreachable') return '';
    if (c.slow)
      return c.skipped
        ? t('messages.other-facilities-skipped-slow')
        : t('messages.central-slow');
    return c.skipped
      ? t('messages.other-facilities-skipped')
      : t('messages.failed-to-reach-central');
  };
  const skippedCentral = () => {
    const c = central();
    return c.kind === 'unreachable' && c.skipped === true;
  };
  // The central server already holds every patient; elsewhere the link is
  // offered once there are matches here (none here searches automatically).
  const offerOtherFacilities = () =>
    !isCentralServer() && localRows().length > 0 && central().kind === 'idle';
  // Paged with no total (counting a broad match on a big register is the
  // slow part): the standard pager's Previous · page · Next.
  // Changing page scrolls back to the table's top: the dialog body scrolls,
  // not the table, so from the pager at its foot the table's own loading
  // spinner (and the new page's first rows) would be out of sight.
  let localTable: HTMLDivElement | undefined;
  let centralSection: HTMLDivElement | undefined;
  const toTopOf = (element: HTMLElement | undefined) =>
    element?.scrollIntoView(smoothScrollOptions({ block: 'start' }));
  const localPagination = () => {
    const l = pageOf(local());
    return l
      ? {
          offset: l.offset,
          pageSize: FIND_LIMIT,
          more: l.more,
          onOffsetChange: (offset: number) => {
            toTopOf(localTable);
            void goToLocalPage(offset);
          },
        }
      : undefined;
  };
  const centralPagination = () => {
    const c = pageOf(central());
    return c
      ? {
          offset: c.offset,
          pageSize: FIND_LIMIT,
          more: c.more,
          onOffsetChange: (offset: number) => {
            toTopOf(centralSection);
            const s = searched();
            if (s) void searchOtherFacilities(s, offset);
          },
        }
      : undefined;
  };
  // Patients from other facilities that aren't listed here already.
  const centralRows = () => {
    const here = new Set(localRows().map(r => r.id));
    return (pageOf(central())?.rows ?? []).filter(r => !here.has(r.id));
  };

  const firstField = createFocusTarget();
  const columns = patientFindColumns<PatientFindRow>();

  const createButton = () => (
    <Show when={props.onCreatePatient}>
      <Button
        variant="secondary"
        icon={<PlusCircleIcon />}
        disabled={busy()}
        data-testid="create-patient-button"
        onClick={createPatient}
      >
        {t('button.new-patient')}
      </Button>
    </Show>
  );

  return (
    <Dialog
      open={props.open}
      dismissable={!holdsClose()}
      onClose={close}
      size="large"
      title={props.title}
      testId="patient-search-dialog"
      initialFocus={firstField}
      // Enter searches (handled on the fields), it doesn't confirm.
      enterConfirms={false}
      headerActions={createButton()}
      actionsLead={
        <Show when={chooseError() ?? props.error}>
          {message => (
            <Alert severity="error" testId="patient-search-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <CancelButton
          data-testid="dialog-button-cancel"
          disabled={holdsClose()}
          onClick={close}
        />
      }
    >
      <Stack gap="md">
        <Show when={props.changingFrom}>
          {from => (
            <Text variant="body" data-testid="patient-search-changing-from">
              {t('messages.changing-patient-from', { name: from() })}
            </Text>
          )}
        </Show>
        <FormRow minItemWidth="9rem">
          <TextField
            label={t('label.first-name')}
            ref={firstField.ref}
            data-testid="patient-search-first-name"
            value={fields.firstName}
            onInput={e => setField('firstName', e.currentTarget.value)}
            onKeyDown={onFieldKeyDown}
          />
          <TextField
            label={t('label.last-name')}
            data-testid="patient-search-last-name"
            value={fields.lastName}
            onInput={e => setField('lastName', e.currentTarget.value)}
            onKeyDown={onFieldKeyDown}
          />
          <TextField
            label={t('label.date-of-birth')}
            data-testid="patient-search-date-of-birth"
            placeholder={localeDateFormat().toUpperCase()}
            helperText={t('messages.date-of-birth-search-hint')}
            error={dobError()}
            value={fields.dateOfBirth}
            onInput={e => setField('dateOfBirth', e.currentTarget.value)}
            onKeyDown={onFieldKeyDown}
          />
          <TextField
            label={t('label.patient-id')}
            data-testid="patient-search-code"
            value={fields.id}
            onInput={e => setField('id', e.currentTarget.value)}
            onKeyDown={onFieldKeyDown}
          />
        </FormRow>

        <Show when={link().kind !== 'idle'}>
          <Show
            when={failedLink()}
            fallback={
              <Alert severity="info" testId="patient-search-linking">
                <HStack gap="sm" align="center">
                  <Spinner sizeRem={1} />
                  {t('messages.getting-patient')}
                </HStack>
              </Alert>
            }
          >
            {failed => (
              <Alert severity="warning" testId="patient-search-link-failed">
                <HStack gap="md" align="center" wrap>
                  <span>{failed().message}</span>
                  <Button
                    variant="secondary"
                    size="small"
                    icon={<RefreshIcon />}
                    data-testid="patient-search-link-retry"
                    onClick={() => {
                      const l = failedLink();
                      if (l) void chooseCentral(l.patient);
                    }}
                  >
                    {t('button.retry')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    data-testid="patient-search-link-cancel"
                    onClick={() => setLink({ kind: 'idle' })}
                  >
                    {t('button.cancel')}
                  </Button>
                </HStack>
              </Alert>
            )}
          </Show>
        </Show>

        <Show
          when={searched()}
          fallback={
            <Show
              when={props.showRecent && recent().length > 0}
              fallback={
                <EmptyState
                  data-testid="patient-search-prompt"
                  illustration={<SearchIcon class={styles.searchGraphic} />}
                  title={t('heading.find-patient')}
                  message={t('messages.patient-search-hint')}
                />
              }
            >
              <Stack gap="sm" data-testid="patient-search-recent">
                <Text variant="subtitle">{t('heading.recent-patients')}</Text>
                <DataTable
                  dialogTable
                  columns={columns}
                  rows={recent()}
                  rowKey={r => r.id}
                  loading={choosingHere()}
                  onRowClick={row => void choose(row)}
                  showFullScreen={false}
                  emptyMessage={t('messages.no-matching-patients')}
                />
              </Stack>
            </Show>
          }
        >
          <div ref={localTable}>
            <DataTable
              dialogTable
              columns={columns}
              rows={localRows()}
              rowKey={r => r.id}
              loading={local().kind === 'searching' || choosingHere()}
              pagination={localPagination()}
              onRowClick={row => void choose(row)}
              showFullScreen={false}
              emptyGraphic={false}
              emptyMessage={t('messages.no-matching-patients')}
              empty={
                <Show when={props.onCreatePatient}>
                  <Button
                    variant="ghost"
                    disabled={busy()}
                    data-testid="nothing-here-create-button"
                    onClick={createPatient}
                  >
                    {t('button.create-a-new-one')}
                  </Button>
                </Show>
              }
              // Only when there's something in it: an empty slot still draws
              // the toolbar row.
              filters={
                offerOtherFacilities() ? (
                  <Button
                    variant="ghost"
                    icon={<SearchIcon />}
                    data-testid="search-other-facilities-button"
                    onClick={() => {
                      const s = searched();
                      if (s) void searchOtherFacilities(s);
                    }}
                  >
                    {t('button.search-other-facilities')}
                  </Button>
                ) : undefined
              }
            />
          </div>
        </Show>

        {/* Other facilities, once asked: the same table as this store's,
            with its own loading state while central answers. */}
        <Show when={central().kind !== 'idle'}>
          <Stack
            gap="sm"
            ref={centralSection}
            data-testid="other-facilities-results"
          >
            <Text variant="subtitle">{t('heading.at-other-facilities')}</Text>
            <Show when={central().kind === 'unreachable'}>
              <Alert severity="warning" testId="central-search-error">
                <HStack gap="md" align="center" wrap>
                  <span>{centralMessage()}</span>
                  <Button
                    variant="secondary"
                    size="small"
                    data-testid="central-search-retry"
                    icon={skippedCentral() ? <SearchIcon /> : <RefreshIcon />}
                    onClick={() => {
                      const s = searched();
                      if (s) void searchOtherFacilities(s);
                    }}
                  >
                    {skippedCentral()
                      ? t('button.search-other-facilities')
                      : t('button.retry')}
                  </Button>
                </HStack>
              </Alert>
            </Show>
            <Show when={centralRows().length > 0}>
              <Text variant="body">
                {t('messages.choosing-links-to-store')}
              </Text>
            </Show>
            <DataTable
              dialogTable
              columns={columns}
              rows={centralRows()}
              rowKey={r => r.id}
              loading={central().kind === 'searching'}
              pagination={centralPagination()}
              onRowClick={row => void chooseCentral(row)}
              showFullScreen={false}
              emptyGraphic={false}
              // When central is out of reach, the warning above says so.
              emptyMessage={
                central().kind === 'unreachable'
                  ? t('messages.nothing-here')
                  : t('messages.no-matches-at-other-facilities')
              }
            />
          </Stack>
        </Show>
      </Stack>
    </Dialog>
  );
};
