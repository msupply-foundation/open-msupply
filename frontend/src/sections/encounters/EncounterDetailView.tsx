import {
  createMemo,
  createResource,
  createSignal,
  Match,
  Show,
  Suspense,
  Switch,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { gated } from '../../api/gated';
import { t, localisedDate, getDisplayAge } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '../../ui/layout/Header/HeaderToolbar';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { FormRowItem } from '../../ui/layout/Form/FormRowItem';
import { FormErrorSummary } from '../../ui/layout/Form/FormErrorSummary';
import { Stack } from '../../ui/layout/Stack/Stack';
import { createSidePanelOpen } from '../../ui/layout/SidePanel/createSidePanelOpen';
import { Button } from '../../ui/elements/buttons/Button';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import {
  CheckCircleIcon,
  FileIcon,
  SaveIcon,
  SidebarIcon,
  XCircleIcon,
} from '../../ui/icons';
import { ALT_M } from '../../ui/utils/shortcuts';
import { hasPermission } from '../../store/storeContext';
import { createConfirmOnLeave } from '../../domain/confirmOnLeave';
import { visitedFields } from '../../domain/encounter/visited';
import {
  EncounterClinicianField,
  EncounterStatusMenu,
  EncounterVisitDateField,
  encounterVisitLabels,
} from '../../domain/encounter/EncounterVisitFields';
import {
  createDocumentForm,
  persistDocument,
} from '../../domain/documentForm/createDocumentForm';
import { DocumentKeptValues } from '../../domain/documentForm/DocumentKeptValues';
import { DocumentVersionNotice } from '../../domain/documentForm/DocumentVersionNotice';
import { DocumentFormRegion } from '../../plugins/DocumentFormRegion';
import { documentFormVersioning } from '../../plugins/documentFormSlot';
import type { Encounter } from '../../plugin-sdk/documents';
import { VaccinationCardRegion } from '../vaccination-card';
import {
  EnrolmentModal,
  type EnrolmentTarget,
} from '../program-enrolment/EnrolmentModal';
import {
  CreateEncounterDialog,
  startsNow,
  type CreatedEncounter,
} from '../patients/detail/programs/CreateEncounterDialog';
import { fetchEncounterRecord } from './encounterRecord';
import { EncounterSidePanel } from './EncounterSidePanel';
import { fetchNextVisit, type NextVisit } from './nextVisit';

/*
 * The encounter record screen (kdd/custom-forms/specs.md § Forms in the UI: the
 * host record screen). The host owns the route, the frame, the toolbar and the
 * save; the body is the plugin form contributed for the encounter's type, or
 * the host's default encounter form (DocumentFormRegion). The toolbar's visit
 * date and clinician, the status chip beside the title and the body's fields
 * edit one draft, the document form host's, saved in one go by Save.
 *
 * The frame follows Product's program-enrolment prototype: the status as a
 * chip at the end of the breadcrumb trail, opening the statuses it can move
 * to, and reading Missed for a Scheduled visit whose day has passed; the
 * patient with their date of birth and age among the header's facts; a
 * Medical file button opening the encounter's enrolment; and a More side
 * panel with who entered the encounter and when, its notes where the form
 * renders none, the patient's earlier encounters of the type, and Delete
 * (EncounterSidePanel).
 *
 * Opened from a patient's Encounters row, and after "New encounter" creates
 * one whose visit is under way. Every read is non-suspending: the screen
 * shows its own spinner while the encounter and its document load. A read the
 * server refuses or that fails ends in the not-found notice, not the spinner
 * (encounterRecord.ts).
 *
 * An encounter recorded under an earlier version of its type opens as the
 * form host resolves it (DocumentVersionNotice above the body): read-only in
 * its archived form, with Edit to bring it into the current one, or in the
 * current form after migration.
 *
 * The footer's save follows the status (the same prototype;
 * the old client's Save progress and Mark as visited). A Scheduled or Missed
 * visit, Pending as stored, offers Save as visited, which records the status
 * and, where none is recorded, the end time (domain/encounter/visited.ts),
 * then prompts to schedule the next visit: the create-encounter dialog,
 * prefilled with the same type, the date the program suggests and what it
 * is for (nextVisit.ts). Book writes the visit and leaves for the patient's
 * Encounters tab; Not now stays. Save draft, beside it once something has
 * changed, saves the visit as it stands. A Visited or Cancelled encounter
 * offers Save, enabled once something has changed. A status picked from the
 * chip is an edit like any other: the footer follows the draft.
 *
 * TO-DO: write this screen's spec (implementation-plan H26).
 */
const EncounterDetailView: Component = () => {
  const params = useParams<{ storeId: string; encounterId: string }>();
  const navigate = useNavigate();

  const [recordData] = createResource(
    () => ({ storeId: params.storeId, id: params.encounterId }),
    fetchEncounterRecord
  );
  const record = () => gated(recordData)?.record;

  const source = createMemo(
    () => {
      const name = record()?.document.name;
      return name ? { kind: 'existing' as const, name } : undefined;
    },
    undefined,
    { equals: (a, b) => a?.name === b?.name }
  );

  // Read-only for a user who may edit no program's records here, so nothing
  // fills in or offers a save the server would refuse. One who may edit some
  // programs but not this one still gets a save, which the server refuses.
  // TO-DO: gate on the encounter's own program once the store's permissions
  // say which programs a user may edit (remaining work item 13).
  const canMutate = () => hasPermission('DOCUMENT_MUTATE');
  const form = createDocumentForm<Encounter>({
    storeId: () => params.storeId,
    patientId: () => record()?.patientId ?? '',
    source,
    labels: encounterVisitLabels,
    readOnly: () => !canMutate(),
    versioning: type => documentFormVersioning('encounter.form', type),
  });
  const archivedVersion = () => {
    const v = form.version();
    return v.kind === 'archived' ? v.version : undefined;
  };
  const draft = form.draft;

  // The More panel: the shared open state (open by default on a very wide
  // viewport, the user's choice persisted), as every detail screen's.
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();

  // The Medical file button opens the encounter's enrolment in the enrolment
  // modal (spec/program-enrolment S3), as the old client's Medical file info.
  const [enrolmentTarget, setEnrolmentTarget] = createSignal<EnrolmentTarget>();
  const enrolmentDocumentName = () => record()?.programEnrolment?.document.name;

  const patientHref = () =>
    `/${params.storeId}/dispensary/patients/${record()?.patientId ?? ''}?tab=encounters`;
  const leave = () => navigate(patientHref());

  const leaveGuard = createConfirmOnLeave({
    isDirty: form.isDirty,
    onDiscard: form.discard,
  });

  // Save as visited: the status and end time, saved; a save that does not
  // go through (the error summary says why) puts them back, so the footer
  // still offers Save as visited once the form is put right. The footer is
  // held on its pending reading for the whole run — Save as visited busy,
  // Close disabled — through the save and the prompt's reads that follow:
  // setting the status would otherwise flip the status-keyed footer at the
  // click, unmounting Save as visited before its own busy state could show
  // and leaving a Close the user could press in the gap. `savingAsVisited`,
  // cleared in a `finally`, keeps the pending footer up until the run ends.
  // The prompt opens only where the patient has a type to book.
  const [nextVisit, setNextVisit] = createSignal<NextVisit>();
  const [savingAsVisited, setSavingAsVisited] = createSignal(false);
  const saveAsVisited = async () => {
    setSavingAsVisited(true);
    try {
      const before = {
        status: draft.data.status,
        endDatetime: draft.data.endDatetime,
      };
      const fields = visitedFields(draft.data.endDatetime, new Date());
      draft.set('status', fields.status);
      draft.set('endDatetime', fields.endDatetime);
      const saved = await form.save();
      if (!saved) {
        draft.set('status', before.status);
        draft.set('endDatetime', before.endDatetime);
        return;
      }
      const enrolment = record()?.programEnrolment;
      const next = await fetchNextVisit({
        storeId: params.storeId,
        patientId: record()?.patientId ?? '',
        encounterId: params.encounterId,
        immunisationEnrolmentId: enrolment?.isImmunisationProgram
          ? enrolment.id
          : undefined,
      });
      if (next.registries.length > 0) setNextVisit(next);
    } finally {
      setSavingAsVisited(false);
    }
  };
  const nextVisitCreated = (created: CreatedEncounter) => {
    setNextVisit(undefined);
    if (startsNow(created.startDatetime))
      navigate(
        `/${params.storeId}/dispensary/encounter/${created.encounterId}`
      );
    else leave();
  };

  // Delete: the document as stored, written again with the Deleted status,
  // pinned to the schema version it was recorded under (its data is not
  // migrated, so the current version could refuse it or be pinned to it
  // wrongly). Not the form's save, which would validate the draft (an empty
  // visit with required fields could never be deleted), save whatever was
  // edited along with the deletion, and run the form's own save steps — a
  // prescription control's would issue stock against a visit being thrown
  // away. What was edited is dropped with the record. A refusal is shown
  // above the form.
  const [deleting, setDeleting] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal<string>();
  const deleteEncounter = async () => {
    const stored = form.document();
    const r = form.registry();
    if (!stored || !r || deleting()) return;
    setDeleting(true);
    setDeleteError(undefined);
    const result = await persistDocument({
      storeId: params.storeId,
      patientId: record()?.patientId ?? '',
      registry: r,
      parent: stored.id,
      data: { ...(stored.data as object), status: 'DELETED' },
      schemaId: stored.schema?.id,
    });
    setDeleting(false);
    if (result.kind === 'refused') {
      setDeleteError(result.message);
      return;
    }
    if (result.kind === 'reported') return;
    form.discard();
    leave();
  };
  const storedStart = () =>
    (form.document()?.data as Partial<Encounter> | undefined)?.startDatetime;

  const typeName = () => form.registry()?.name ?? record()?.type ?? '';
  const crumbs = () => {
    const start = draft.data.startDatetime;
    const leaf = start
      ? `${typeName()} – ${localisedDate(start)}`
      : typeName() || t('label.encounter');
    return [
      {
        label: t('label.patients'),
        onClick: () => navigate(`/${params.storeId}/dispensary/patients`),
      },
      { label: record()?.patient.name ?? '', onClick: leave },
      { label: leaf },
    ];
  };

  // The patient as the header states them: name, then date of birth with
  // the age it gives, where there is one ("Smith, Jay · 08/07/2026 (3
  // months, 13 days)").
  const patientFact = () => {
    const patient = record()?.patient;
    if (!patient) return '';
    if (!patient.dateOfBirth) return patient.name;
    const age = getDisplayAge(patient.dateOfBirth);
    const birth = localisedDate(patient.dateOfBirth);
    return `${patient.name} · ${birth}${age ? ` (${age})` : ''}`;
  };

  const ready = () => form.status() === 'ready';

  return (
    <Switch>
      <Match
        when={gated(recordData) === undefined || form.status() === 'loading'}
      >
        <Spinner center />
      </Match>
      <Match when={!record() || form.status() === 'not-found'}>
        <Page
          header={
            <Header>
              <Breadcrumb crumbs={[{ label: t('label.encounter') }]} />
            </Header>
          }
        >
          <ContentContainer size="form" padded>
            <Alert severity="error" testId="encounter-not-found-notice">
              {t('messages.record-not-found')}
            </Alert>
          </ContentContainer>
        </Page>
      </Match>
      <Match when={ready() && form.library()}>
        {lib => {
          const Default = lib().DefaultEncounterForm;
          return (
            <Page
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.more')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <EncounterSidePanel
                  storeId={params.storeId}
                  encounterId={params.encounterId}
                  patientId={record()?.patientId ?? ''}
                  type={record()?.type ?? ''}
                  startDatetime={storedStart()}
                  draft={draft}
                  formEditsNotes={draft.namesField('notes')}
                  canMutate={canMutate()}
                  onDelete={() => void deleteEncounter()}
                />
              }
              header={
                <Header>
                  <Breadcrumb
                    crumbs={crumbs()}
                    status={<EncounterStatusMenu draft={draft} />}
                  />
                  <HeaderButtons>
                    <Show when={enrolmentDocumentName()}>
                      {name => (
                        <Button
                          variant="secondary"
                          icon={<FileIcon />}
                          collapsible="narrow"
                          title={t('button.enrolment-info')}
                          data-testid="encounter-medical-file-button"
                          onClick={() =>
                            setEnrolmentTarget({
                              kind: 'existing',
                              documentName: name(),
                            })
                          }
                        >
                          {t('button.enrolment-info')}
                        </Button>
                      )}
                    </Show>
                    {/* More — the closed-panel reopen affordance, as on every
                        detail screen; createSidePanelOpen registers Alt+M,
                        this is the control that advertises it. */}
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<SidebarIcon />}
                        collapsible="narrow"
                        title={t('button.more')}
                        data-testid="open-detail-panel-button"
                        shortcut={ALT_M}
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  {/* Floors: 12 + 10 + 13 + 10 = 45rem for four fields. The
                      patient's name with their date of birth and age is the
                      long one; the date is a fixed-format scalar. */}
                  <HeaderToolbar>
                    <FormRowItem weight={1.8} minWidth="12rem">
                      <LabelledValue
                        label={t('label.patient')}
                        variant="field"
                        size="small"
                        data-testid="encounter-patient"
                      >
                        {patientFact()}
                      </LabelledValue>
                    </FormRowItem>
                    <FormRowItem weight={1}>
                      <LabelledValue
                        label={t('label.program')}
                        variant="field"
                        size="small"
                        data-testid="encounter-program"
                      >
                        {record()?.programEnrolment?.document.documentRegistry
                          ?.name || '—'}
                      </LabelledValue>
                    </FormRowItem>
                    <FormRowItem weight={0} minWidth="13rem">
                      <EncounterVisitDateField draft={draft} size="small" />
                    </FormRowItem>
                    <FormRowItem weight={1.4}>
                      <EncounterClinicianField draft={draft} size="small" />
                    </FormRowItem>
                  </HeaderToolbar>
                </Header>
              }
              contentFooter={
                <ContentFooter>
                  <ContentFooterActions>
                    <Button
                      variant="secondary"
                      icon={<XCircleIcon />}
                      data-testid="cancel-button"
                      disabled={savingAsVisited()}
                      onClick={leave}
                    >
                      {form.isDirty() ? t('button.cancel') : t('button.close')}
                    </Button>
                    <Show when={canMutate()}>
                      {/* The Save-as-visited run holds this branch up even
                          once the status has gone to Visited, so the busy
                          button is not swapped out mid-save (see
                          saveAsVisited). */}
                      <Show
                        when={
                          draft.data.status === 'PENDING' || savingAsVisited()
                        }
                        fallback={
                          <Button
                            icon={<SaveIcon />}
                            data-testid="save-button"
                            loading={form.saving()}
                            disabled={!form.canSave() || form.saving()}
                            onClick={() => void form.save()}
                          >
                            {t('button.save')}
                          </Button>
                        }
                      >
                        <Show when={form.canSave() && !savingAsVisited()}>
                          <Button
                            variant="secondary"
                            icon={<SaveIcon />}
                            data-testid="save-draft-button"
                            loading={form.saving()}
                            disabled={form.saving()}
                            onClick={() => void form.save()}
                          >
                            {t('button.save-draft')}
                          </Button>
                        </Show>
                        <Button
                          icon={<CheckCircleIcon />}
                          data-testid="save-as-visited-button"
                          loading={savingAsVisited()}
                          disabled={draft.readOnly() || savingAsVisited()}
                          onClick={() => void saveAsVisited()}
                        >
                          {t('button-save-as-visited')}
                        </Button>
                      </Show>
                    </Show>
                  </ContentFooterActions>
                </ContentFooter>
              }
            >
              <ContentContainer size="form" padded>
                <Stack>
                  <Show when={form.saveError() ?? deleteError()}>
                    {message => <Alert severity="error">{message()}</Alert>}
                  </Show>
                  <DocumentVersionNotice
                    version={form.version()}
                    onEdit={form.edit}
                  />
                  <DocumentFormRegion
                    slot="encounter.form"
                    documentType={form.registry()?.documentType ?? ''}
                    draft={draft}
                    record={{
                      patientId: record()?.patientId ?? '',
                      documentName: form.document()?.name,
                    }}
                    participation={form.coordinator.participationFor}
                    fallback={() => <Default draft={draft} />}
                    archivedVersion={archivedVersion()}
                    currentSchemaId={form.registry()?.formSchemaId}
                    recorded={form.recorded()}
                  />
                  <DocumentKeptValues values={form.kept()} />
                  <FormErrorSummary
                    errors={form.validation.visible()}
                    testId="encounter-error-summary"
                  />
                </Stack>
              </ContentContainer>
              {/* An immunisation encounter shows its enrolment's vaccination
                  card beneath the form (spec/vaccination-card S2). Each dose
                  saves on its own, apart from the encounter's Save. The card
                  needs the full width, so it sits outside the form measure,
                  under its own Suspense: loading its chunk suspends only it. */}
              <Show
                when={
                  record()?.programEnrolment?.isImmunisationProgram &&
                  record()?.programEnrolment
                }
              >
                {enrolment => (
                  <ContentContainer size="wide" padded>
                    <Suspense fallback={<Spinner center />}>
                      <VaccinationCardRegion
                        storeId={params.storeId}
                        encounterId={params.encounterId}
                        patientId={record()?.patientId ?? ''}
                        programEnrolmentId={enrolment().id}
                        encounterClinicianId={draft.data.clinician?.id ?? null}
                      />
                    </Suspense>
                  </ContentContainer>
                )}
              </Show>
              <EnrolmentModal
                storeId={params.storeId}
                patientId={record()?.patientId ?? ''}
                target={enrolmentTarget()}
                onClose={() => setEnrolmentTarget(undefined)}
                onSaved={() => undefined}
              />
              <CreateEncounterDialog
                open={nextVisit() !== undefined}
                storeId={params.storeId}
                patientId={record()?.patientId ?? ''}
                registries={nextVisit()?.registries ?? []}
                defaultType={record()?.type}
                nextVisit={{
                  patientName: record()?.patient.name ?? '',
                  startDatetime: nextVisit()?.startDatetime,
                  reason: nextVisit()?.reason,
                }}
                onCreated={nextVisitCreated}
                onClose={() => setNextVisit(undefined)}
              />
              <ConfirmDialog
                open={leaveGuard.open()}
                title={t('heading.are-you-sure')}
                message={t('messages.discard-changes')}
                confirmLabel={t('button.discard')}
                onConfirm={leaveGuard.confirm}
                onClose={leaveGuard.cancel}
              />
            </Page>
          );
        }}
      </Match>
    </Switch>
  );
};

export default EncounterDetailView;
