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
import { t, localisedDate } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderToolbar } from '../../ui/layout/Header/HeaderToolbar';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { FormRowItem } from '../../ui/layout/Form/FormRowItem';
import { FormErrorSummary } from '../../ui/layout/Form/FormErrorSummary';
import { Stack } from '../../ui/layout/Stack/Stack';
import { Button } from '../../ui/elements/buttons/Button';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import {
  CancelButton,
  DialogSaveButton,
} from '../../ui/elements/buttons/StandardButtons';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import { SaveIcon, XCircleIcon } from '../../ui/icons';
import { createConfirmOnLeave } from '../../domain/confirmOnLeave';
import { suggestsVisited, visitedFields } from '../../domain/encounter/visited';
import {
  EncounterClinicianField,
  EncounterStatusField,
  EncounterVisitDateField,
  encounterVisitLabels,
} from '../../domain/encounter/EncounterVisitFields';
import { createDocumentForm } from '../../domain/documentForm/createDocumentForm';
import { DocumentKeptValues } from '../../domain/documentForm/DocumentKeptValues';
import { DocumentVersionNotice } from '../../domain/documentForm/DocumentVersionNotice';
import { DocumentFormRegion } from '../../plugins/DocumentFormRegion';
import { documentFormVersioning } from '../../plugins/documentFormSlot';
import type { Encounter } from '../../plugin-sdk/documents';
import { VaccinationCardRegion } from '../vaccination-card';
import { fetchEncounterRecord } from './encounterRecord';

/*
 * The encounter record screen (kdd/custom-forms/specs.md § Forms in the UI: the
 * host record screen). The host owns the route, the frame, the toolbar and the
 * save; the body is the plugin form contributed for the encounter's type, or
 * the host's default encounter form (DocumentFormRegion). The toolbar's visit
 * date, clinician and status and the body's fields edit one draft, the document
 * form host's, saved in one go by Save.
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
 * Save on an encounter still Pending whose visit date has passed asks first
 * whether to record it as visited (domain/encounter/visited.ts): Save keeps
 * it Pending; Save as visited sets the status and, where none is recorded,
 * the end time.
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

  const form = createDocumentForm<Encounter>({
    storeId: () => params.storeId,
    patientId: () => record()?.patientId ?? '',
    source,
    labels: encounterVisitLabels,
    versioning: type => documentFormVersioning('encounter.form', type),
  });
  const archivedVersion = () => {
    const v = form.version();
    return v.kind === 'archived' ? v.version : undefined;
  };
  const draft = form.draft;

  const patientHref = () =>
    `/${params.storeId}/dispensary/patients/${record()?.patientId ?? ''}?tab=encounters`;
  const leave = () => navigate(patientHref());

  const leaveGuard = createConfirmOnLeave({
    isDirty: form.isDirty,
    onDiscard: form.discard,
  });

  const [askingVisited, setAskingVisited] = createSignal(false);
  const onSave = () => {
    const saved = form.document()?.data as Partial<Encounter> | undefined;
    if (suggestsVisited(saved, draft.data.status, new Date())) {
      setAskingVisited(true);
    } else {
      void form.save();
    }
  };
  const saveAsIs = () => {
    setAskingVisited(false);
    void form.save();
  };
  const saveAsVisited = () => {
    const fields = visitedFields(draft.data.endDatetime, new Date());
    draft.set('status', fields.status);
    draft.set('endDatetime', fields.endDatetime);
    setAskingVisited(false);
    void form.save();
  };

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
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs()} />
                  <HeaderToolbar>
                    <FormRowItem weight={1.2}>
                      <LabelledValue
                        label={t('label.program')}
                        variant="field"
                        size="small"
                      >
                        {record()?.programEnrolment?.document.documentRegistry
                          ?.name || '—'}
                      </LabelledValue>
                    </FormRowItem>
                    <FormRowItem weight={0} minWidth="13rem">
                      <EncounterVisitDateField draft={draft} size="small" />
                    </FormRowItem>
                    <FormRowItem weight={1.5}>
                      <EncounterClinicianField draft={draft} size="small" />
                    </FormRowItem>
                    <FormRowItem weight={1}>
                      <EncounterStatusField draft={draft} size="small" />
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
                      onClick={leave}
                    >
                      {form.isDirty() ? t('button.cancel') : t('button.close')}
                    </Button>
                    <Button
                      icon={<SaveIcon />}
                      data-testid="save-button"
                      loading={form.saving()}
                      disabled={!form.canSave() || form.saving()}
                      onClick={onSave}
                    >
                      {t('button.save')}
                    </Button>
                  </ContentFooterActions>
                </ContentFooter>
              }
            >
              <ContentContainer size="form" padded>
                <Stack>
                  <Show when={form.saveError()}>
                    <Alert severity="error">{form.saveError()}</Alert>
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
              <Show when={askingVisited()}>
                <Dialog
                  open
                  onClose={() => setAskingVisited(false)}
                  title={t('messages.save-encounter-as-visited')}
                  testId="save-as-visited-dialog"
                  actions={
                    <>
                      <CancelButton
                        data-testid="dialog-button-cancel"
                        onClick={() => setAskingVisited(false)}
                      />
                      <DialogSaveButton
                        data-testid="dialog-button-save"
                        onClick={saveAsIs}
                      />
                      <Button
                        variant="primary"
                        confirms="continuing"
                        data-testid="dialog-button-save-as-visited"
                        onClick={saveAsVisited}
                      >
                        {t('button-save-as-visited')}
                      </Button>
                    </>
                  }
                />
              </Show>
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
