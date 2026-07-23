import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t, localisedDate } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { PlusCircleIcon, SaveIcon, XCircleIcon } from '../../../ui/icons';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { hasPermission } from '../../../store/storeContext';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { genderLabel } from '../../../domain/patient';
import { Patient, type PatientVariables } from './patient.generated';
import { runUpdatePatient } from '../patientApi';
import {
  ageFromDob,
  draftEquals,
  emptyDraft,
  isDraftValid,
  seedDraft,
  toUpdateInput,
  type PatientDraft,
} from './patientEdit';
import { PatientDetailsForm } from './PatientDetailsForm';
import { InsurancePanel } from './insurance/InsurancePanel';
import { InsuranceModal } from './insurance/InsuranceModal';
import {
  fetchInsuranceProviders,
  fetchInsurancePolicies,
} from './insurance/insuranceApi';
import type { InsurancePolicyFragment } from './insurance/insurance.generated';

// S3 — the patient detail screen (spec/patients). Summary header + tabs
// (Details / Insurance / Log). The Details tab is the plain-path built-in form,
// buffered locally and committed on an explicit Save behind a confirmation,
// with a discard prompt when leaving dirty (the StockLineDetailView model). The
// Insurance tab (spec § insurance policies) lists the patient's policies and
// adds/edits them, gated on the site having configured insurance providers. The
// Log tab reuses the shared activity-log surface.
//
// NOT built here (owned by other/unbuilt verticals — see the implementation
// flags): the document-path schema-driven form, the Custom fields tab, and the
// Programs / Encounters / Vaccinations / Contact-tracing tabs.

const PatientDetailView: Component = () => {
  const params = useParams<{ storeId: string; patientId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams<{ tab?: string }>();

  const activeTab = () => searchParams.tab ?? 'details';
  const setActiveTab = (value: string) =>
    setSearchParams({ tab: value === 'details' ? undefined : value });

  const [data, { refetch }] = createResource(
    () =>
      JSON.stringify({
        storeId: params.storeId,
        patientId: params.patientId,
      }),
    async serialised => {
      const result = await graphqlFetch(
        Patient,
        JSON.parse(serialised) as PatientVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.patient ?? undefined;
    }
  );
  const node = () => data.latest ?? undefined;

  // Local edit buffer, seeded from the fetched patient and re-seeded on id
  // change / after a save (never on a same-id refetch, to keep focus).
  const [edit, setEdit] = createStore<PatientDraft>(emptyDraft());
  const [seededId, setSeededId] = createSignal<string>();
  createEffect(
    on(node, n => {
      if (n && n.id !== seededId()) {
        setEdit(seedDraft(n));
        setSeededId(n.id);
      }
    })
  );

  const setField = <K extends keyof PatientDraft>(
    key: K,
    value: PatientDraft[K]
  ) => setEdit(key, value);

  const canMutate = () => hasPermission('PATIENT_MUTATE');

  const isDirty = createMemo(() => {
    const n = node();
    if (!n || seededId() === undefined) return false;
    return !draftEquals(edit, seedDraft(n));
  });

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');
  const [confirmSaveOpen, setConfirmSaveOpen] = createSignal(false);
  const [discardOpen, setDiscardOpen] = createSignal(false);

  // Insurance (spec § insurance policies). The tab + add action gate on the
  // site having at least one configured (active) insurance provider; policies
  // load only once that surface is shown. Modal state: undefined = closed,
  // { policy? } = open (a policy present ⇒ edit, absent ⇒ add). `.latest` reads
  // keep these off the Suspense boundary the patient resource owns.
  const [providers] = createResource(
    () => params.storeId,
    fetchInsuranceProviders
  );
  const hasInsurance = () => (providers.latest ?? []).length > 0;

  const [insuranceState, setInsuranceState] = createSignal<{
    policy?: InsurancePolicyFragment;
  }>();

  const [policiesData, { refetch: refetchPolicies }] = createResource(
    () =>
      hasInsurance()
        ? { storeId: params.storeId, nameId: params.patientId }
        : undefined,
    fetchInsurancePolicies
  );
  const policies = () => policiesData.latest ?? [];

  // Full-replace edit (AC-E2): toUpdateInput sends every field. On success,
  // re-seed from the refreshed record (name is recomputed server-side) by
  // clearing seededId so the seed effect re-runs, and refetch.
  const doSave = async () => {
    const n = node();
    if (!n || !isDraftValid(edit) || saving()) return;
    setSaving(true);
    const outcome = await runUpdatePatient(
      params.storeId,
      toUpdateInput(n.id, edit)
    );
    setSaving(false);
    setConfirmSaveOpen(false);
    if (!outcome) return; // handled globally
    if (outcome.kind === 'error') {
      setSaveError(outcome.message);
      return;
    }
    setSaveError('');
    setSeededId(undefined);
    void refetch();
  };

  const leave = () => navigate(`/${params.storeId}/dispensary/patients`);
  const onCancelOrClose = () => {
    if (isDirty()) setDiscardOpen(true);
    else leave();
  };

  const displayName = () => node()?.name || t('label.new-patient');

  const crumbs = () => [
    { label: t('label.patients'), onClick: onCancelOrClose },
    { label: displayName() },
  ];

  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    ...(hasInsurance()
      ? [{ value: 'insurance', label: t('label.insurance') }]
      : []),
    { value: 'log', label: t('label.log') },
  ];

  const dobDisplay = (n: NonNullable<ReturnType<typeof node>>) => {
    if (!n.dateOfBirth) return '—';
    const age = ageFromDob(n.dateOfBirth);
    const date = localisedDate(n.dateOfBirth);
    return age === undefined ? date : `${date} (${t('label.age')}: ${age})`;
  };

  return (
    <Suspense fallback={<Spinner center />}>
      <Show when={node()}>
        {n => (
          <Tabs value={activeTab()} onValueChange={setActiveTab}>
            <Page
              fillBody
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs()} />
                  {/* Add insurance — the app-bar page action on the Insurance
                      tab (spec ui-surface S3 layout). Gated on providers being
                      configured + patient-mutate; opens the modal in add mode.
                      (The other-vertical program create actions share this slot
                      once built.) */}
                  <Show when={activeTab() === 'insurance' && canMutate()}>
                    <HeaderButtons>
                      <Button
                        icon={<PlusCircleIcon />}
                        data-testid="add-insurance-header-button"
                        onClick={() => setInsuranceState({})}
                      >
                        {t('button.add-insurance')}
                      </Button>
                    </HeaderButtons>
                  </Show>
                  {/* Summary (spec/patients S3): Patient ID · Gender · DOB
                      (with derived age) live in the app-bar toolbar row above
                      the tabs — the inbound-shipment header-fields pattern —
                      not in the tab body. */}
                  <Toolbar>
                    <div
                      style={{
                        display: 'flex',
                        gap: '2rem',
                        'flex-wrap': 'wrap',
                      }}
                    >
                      <LabelledValue label={t('label.patient-id')}>
                        {n().code}
                      </LabelledValue>
                      <LabelledValue label={t('label.gender')}>
                        {(() => {
                          const g = n().gender;
                          return g ? genderLabel(g) : '—';
                        })()}
                      </LabelledValue>
                      <LabelledValue label={t('label.date-of-birth')}>
                        {dobDisplay(n())}
                      </LabelledValue>
                    </div>
                  </Toolbar>
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                <Show when={activeTab() === 'details'}>
                  <ContentFooter>
                    <ContentFooterActions>
                      <Button
                        variant="secondary"
                        icon={<XCircleIcon />}
                        data-testid="cancel-button"
                        onClick={onCancelOrClose}
                      >
                        {isDirty() ? t('button.cancel') : t('button.close')}
                      </Button>
                      <Show when={canMutate()}>
                        <Button
                          icon={<SaveIcon />}
                          data-testid="save-button"
                          loading={saving()}
                          disabled={
                            !isDirty() || !isDraftValid(edit) || saving()
                          }
                          onClick={() => setConfirmSaveOpen(true)}
                        >
                          {t('button.save')}
                        </Button>
                      </Show>
                    </ContentFooterActions>
                  </ContentFooter>
                </Show>
              }
            >
              <TabPanel value="details">
                {/* fillBody strips the body's edge padding (so the Log table
                    fills the region); the Details form is a padded, centred,
                    width-capped measure of its own (ui-standards/detail-views
                    → detail form). */}
                <div style={{ padding: 'var(--space-5)' }}>
                  <ContentContainer size="form">
                    <Show when={saveError()}>
                      <Alert severity="error">{saveError()}</Alert>
                    </Show>
                    <PatientDetailsForm
                      storeId={params.storeId}
                      draft={edit}
                      setField={setField}
                      disabled={!canMutate()}
                    />
                  </ContentContainer>
                </div>
              </TabPanel>
              <Show when={hasInsurance()}>
                <TabPanel value="insurance">
                  {/* A table — fills the region and owns its own scroll (like
                      the Log tab and the reference line tables), so no body
                      padding wrapper here, unlike the Details form. */}
                  <InsurancePanel
                    policies={policies()}
                    loading={policiesData.loading}
                    disabled={!canMutate()}
                    onAdd={() => setInsuranceState({})}
                    onRowClick={policy => setInsuranceState({ policy })}
                  />
                </TabPanel>
              </Show>
              <TabPanel value="log">
                <ActivityLogPanel storeId={params.storeId} recordId={n().id} />
              </TabPanel>

              <InsuranceModal
                open={insuranceState() !== undefined}
                onClose={() => setInsuranceState(undefined)}
                storeId={params.storeId}
                patientId={n().id}
                patientName={n().name}
                providers={providers.latest ?? []}
                policy={insuranceState()?.policy}
                onSaved={() => void refetchPolicies()}
              />

              <ConfirmDialog
                open={confirmSaveOpen()}
                title={t('heading.are-you-sure')}
                message={t('messages.confirm-save-generic')}
                confirmLabel={t('button.save')}
                cancelLabel={t('button.cancel')}
                onConfirm={() => void doSave()}
                onClose={() => setConfirmSaveOpen(false)}
              />
              <ConfirmDialog
                open={discardOpen()}
                title={t('heading.are-you-sure')}
                message={t('messages.discard-changes')}
                confirmLabel={t('button.discard')}
                cancelLabel={t('button.cancel')}
                onConfirm={leave}
                onClose={() => setDiscardOpen(false)}
              />
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default PatientDetailView;
