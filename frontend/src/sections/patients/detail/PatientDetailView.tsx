import {
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { t, localisedDate, getDisplayAge } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
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
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_N } from '../../../ui/utils/shortcuts';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { PlusCircleIcon, SaveIcon, XCircleIcon } from '../../../ui/icons';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { createConfirmOnLeave } from '../../../domain/confirmOnLeave';
import { genderLabel } from '../../../domain/patient';
import { Patient, type PatientVariables } from './patient.generated';
import { runUpdatePatientCustomFields } from '../patientApi';
import {
  CustomFieldsEditTab,
  EMPTY_FIELD_VALUE,
} from '../../../domain/customFields';
import { createPatientEditor } from './patientEditor';
import { PatientDetailsForm } from './PatientDetailsForm';
import { FormErrorSummary } from '../../../ui/layout/Form/FormErrorSummary';
import { InsurancePanel } from './insurance/InsurancePanel';
import { InsuranceModal } from './insurance/InsuranceModal';
import {
  fetchInsuranceProviders,
  fetchInsurancePolicies,
} from './insurance/insuranceApi';
import type { InsurancePolicyFragment } from './insurance/insurance.generated';
import { ProgramEnrolmentsPanel } from './programs/ProgramEnrolmentsPanel';
import { EncountersPanel } from './programs/EncountersPanel';
import {
  fetchPatientProgramEnrolments,
  fetchPatientEncounters,
} from './programs/programsApi';
import { patientPreferences } from '../../../store/storeContext';

// S3 — the patient detail screen (spec/patients). Summary header + tabs
// (Details / Programs / Encounters / Vaccinations / Insurance / Log). The
// Details tab is the plain-path built-in form, buffered locally and committed
// on an explicit Save behind a confirmation, with a discard prompt when leaving
// dirty (the StockLineDetailView model). The Insurance tab lists the patient's
// policies and adds/edits them (gated on configured providers). The Programs /
// Encounters / Vaccinations tabs are READ-ONLY lists gated on the program
// module — the enrolment/encounter document editors and the vaccination card
// they'd open are owned by other (unbuilt) verticals, so Programs/Vaccinations
// rows are non-clickable and Encounters rows navigate to the (future) encounter
// route. The Log tab reuses the shared activity-log surface.
//
// NOT built here (owned by other/unbuilt verticals — see the implementation
// flags): the document-path schema-driven form, the Custom fields tab, the
// Contact-tracing tab, and — for the program-module tabs above — the enrolment
// / encounter document editors, the create actions (New program / encounter),
// and the vaccination card those rows would open.

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

  // Local edit buffer, duplicate-code check, validation, and full-replace save
  // (spec/patients S3 Details) — shared with the picker's edit modal, so
  // neither surface can drift on these rules (patientEditor.ts).
  const editor = createPatientEditor({
    storeId: () => params.storeId,
    node,
  });

  // Insurance (spec § insurance policies). The tab + add action gate on the
  // site having at least one configured (active) insurance provider; policies
  // load only once that surface is shown. Modal state: undefined = closed,
  // { policy? } = open (a policy present ⇒ edit, absent ⇒ add).
  //
  // Every secondary resource below is read through `gated`, never `.latest`
  // alone: these are read inside tab panels, which Kobalte unmounts while
  // inactive — so the first read happens on the tab click, and suspending then
  // would tear down this whole screen (and detach an open dialog)
  // mid-interaction. Only the patient resource above reads suspending: that is
  // the screen's first load, which has no live user state to lose.
  const [providers] = createResource(
    () => params.storeId,
    fetchInsuranceProviders
  );
  const providerList = () => gated(providers) ?? [];
  const hasInsurance = () => providerList().length > 0;

  const [insuranceState, setInsuranceState] = createSignal<{
    policy?: InsurancePolicyFragment;
  }>();

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the two controls that trigger it (the app-bar button and
  // the ghost button in the Insurance panel's empty slot); each carries
  // `shortcut={ALT_N}` for its badge.
  //
  // Disabled — and so unlisted in the palette — except on the Insurance tab with
  // the mutate permission, which is exactly when either control renders. KB-R2's
  // "unclaimed only where the thing is absent": on the Details tab this screen has
  // no add action, so nothing here answers the key.
  createAddAction({
    name: 'button.add-insurance',
    run: () => setInsuranceState({}),
    disabled: () => activeTab() !== 'insurance' || !editor.canMutate(),
  });

  const [policiesData, { refetch: refetchPolicies }] = createResource(
    () =>
      hasInsurance()
        ? { storeId: params.storeId, nameId: params.patientId }
        : undefined,
    fetchInsurancePolicies
  );
  const policies = () => gated(policiesData) ?? [];

  // Program-module tabs (spec § program-module tabs): Programs / Encounters /
  // Vaccinations, read-only lists gated on the program module. Enrolments load
  // once for both the Programs tab (all) and the Vaccinations tab (immunisation
  // subset, derived client-side); encounters load separately, newest first.
  const hasProgramModule = () => patientPreferences().programModule;

  const [enrolmentsData] = createResource(
    () =>
      hasProgramModule()
        ? {
            storeId: params.storeId,
            filter: { patientId: { equalTo: params.patientId } },
            sort: { key: 'enrolmentDatetime' as const, desc: true },
          }
        : undefined,
    fetchPatientProgramEnrolments
  );
  const enrolments = () => gated(enrolmentsData) ?? [];
  const immunisationEnrolments = () =>
    enrolments().filter(e => e.isImmunisationProgram);

  const [encountersData] = createResource(
    () =>
      hasProgramModule()
        ? {
            storeId: params.storeId,
            filter: { patientId: { equalTo: params.patientId } },
            sort: { key: 'startDatetime' as const, desc: true },
          }
        : undefined,
    fetchPatientEncounters
  );
  const encounters = () => gated(encountersData) ?? [];

  const openEncounter = (encounter: { id: string }) =>
    navigate(`/${params.storeId}/dispensary/encounter/${encounter.id}`);

  const leave = () => navigate(`/${params.storeId}/dispensary/patients`);

  // Discard prompt on any leave from a dirty form (spec § patient edit form):
  // route change, tab switch, browser back, reload / tab close. onDiscard
  // resets the draft so a tab switch — which stays mounted — is truly cleared.
  const leaveGuard = createConfirmOnLeave({
    isDirty: editor.isDirty,
    onDiscard: editor.resetDraft,
  });

  const displayName = () => node()?.name || t('label.new-patient');

  const crumbs = () => [
    { label: t('label.patients'), onClick: leave },
    { label: displayName() },
  ];

  // Custom-fields merge write (spec/patients AC-CF1–CF3). Sends only the
  // changed keys; a cleared field is sent as `null` (never '', which would
  // persist a literal empty value — AC-CF2). Returns true on success so the
  // edit tab clears its dirty state.
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const n = node();
    if (!n) return false;
    const customFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      customFields[key] = value === '' || value === undefined ? null : value;
    }
    const outcome = await runUpdatePatientCustomFields(params.storeId, {
      id: n.id,
      customFields,
    });
    return outcome?.kind === 'ok';
  };

  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    ...(hasProgramModule()
      ? [
          { value: 'programs', label: t('label.programs') },
          { value: 'encounters', label: t('label.encounters') },
          { value: 'vaccinations', label: t('label.vaccinations') },
        ]
      : []),
    ...(hasInsurance()
      ? [{ value: 'insurance', label: t('label.insurance') }]
      : []),
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

  const dobDisplay = (n: NonNullable<ReturnType<typeof node>>) => {
    if (!n.dateOfBirth) return EMPTY_FIELD_VALUE;
    const date = localisedDate(n.dateOfBirth);
    const age = getDisplayAge(n.dateOfBirth);
    return age ? `${date} (${t('label.age')}: ${age})` : date;
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
                  <Show
                    when={activeTab() === 'insurance' && editor.canMutate()}
                  >
                    <HeaderButtons>
                      <Button
                        icon={<PlusCircleIcon />}
                        shortcut={ALT_N}
                        data-testid="add-insurance-header-button"
                        onClick={() => setInsuranceState({})}
                      >
                        {t('button.add-insurance')}
                      </Button>
                    </HeaderButtons>
                  </Show>
                  {/* Summary (spec/patients S3): Patient ID · Gender · DOB
                      (with derived age) live in the app-bar toolbar row above
                      the tabs — the header field cluster, never a hand-rolled
                      <Toolbar> (ui/docs/PAGES.md § header field cluster) — not
                      in the tab body. Every one is a never-editable fact, so
                      the whole cluster is read-only LabelledValues at the
                      inputs' `field` gap and small type scale, which is what
                      lets them line up with an editable field if one is ever
                      added beside them. */}
                  <HeaderToolbar>
                    <LabelledValue
                      label={t('label.patient-id')}
                      variant="field"
                      size="small"
                    >
                      {/* A dash, never blank space: beside a label, blank reads
                          as a rendering fault (ui-standards/detail-views §
                          never-editable fields). A patient retrieved without a
                          code is the case that gets here. */}
                      {n().code || '—'}
                    </LabelledValue>
                    <LabelledValue
                      label={t('label.gender')}
                      variant="field"
                      size="small"
                    >
                      {(() => {
                        const g = n().gender;
                        return g ? genderLabel(g) : EMPTY_FIELD_VALUE;
                      })()}
                    </LabelledValue>
                    <LabelledValue
                      label={t('label.date-of-birth')}
                      variant="field"
                      size="small"
                    >
                      {dobDisplay(n())}
                    </LabelledValue>
                  </HeaderToolbar>
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
                        onClick={leave}
                      >
                        {editor.isDirty()
                          ? t('button.cancel')
                          : t('button.close')}
                      </Button>
                      <Show when={editor.canMutate()}>
                        <Button
                          icon={<SaveIcon />}
                          data-testid="save-button"
                          loading={editor.saving()}
                          disabled={!editor.isDirty() || editor.saving()}
                          onClick={() => void editor.attemptSave()}
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
                    width-capped measure of its own — which is exactly what
                    ContentContainer's `padded` supplies (ui-standards/
                    detail-views → detail form). */}
                <ContentContainer size="form" padded>
                  <Show when={editor.saveError()}>
                    <Alert severity="error">{editor.saveError()}</Alert>
                  </Show>
                  <PatientDetailsForm
                    storeId={params.storeId}
                    patientId={params.patientId}
                    draft={editor.edit}
                    setField={editor.setField}
                    disabled={!editor.canMutate()}
                    errorFor={editor.validation.errorFor}
                  />
                  <FormErrorSummary
                    errors={editor.validation.visible()}
                    testId="patient-detail-error-summary"
                  />
                </ContentContainer>
              </TabPanel>
              <Show when={hasProgramModule()}>
                {/* Read-only program-module lists. Programs + Vaccinations
                    share the enrolment table (Vaccinations = immunisation
                    subset); rows aren't clickable (editing needs the document
                    form / vaccination card, other verticals). Encounters rows
                    navigate to the (future) encounter route. */}
                <TabPanel value="programs">
                  <ProgramEnrolmentsPanel
                    rows={enrolments()}
                    loading={enrolmentsData.loading}
                    tableId="patient-program-enrolment-list"
                    emptyMessage={t('messages.no-programs')}
                  />
                </TabPanel>
                <TabPanel value="encounters">
                  <EncountersPanel
                    rows={encounters()}
                    loading={encountersData.loading}
                    onRowClick={openEncounter}
                  />
                </TabPanel>
                <TabPanel value="vaccinations">
                  <ProgramEnrolmentsPanel
                    rows={immunisationEnrolments()}
                    loading={enrolmentsData.loading}
                    tableId="patient-vaccination-card-list"
                    emptyMessage={t('messages.no-programs')}
                  />
                </TabPanel>
              </Show>
              <Show when={hasInsurance()}>
                <TabPanel value="insurance">
                  {/* A table — fills the region and owns its own scroll (like
                      the Log tab and the reference line tables), so no body
                      padding wrapper here, unlike the Details form. */}
                  <InsurancePanel
                    policies={policies()}
                    loading={policiesData.loading}
                    disabled={!editor.canMutate()}
                    onAdd={() => setInsuranceState({})}
                    onRowClick={policy => setInsuranceState({ policy })}
                  />
                </TabPanel>
              </Show>
              <TabPanel value="custom-fields">
                {/* Custom fields (spec/patients ui-surface; write path AC-CF1–CF3).
                    Disabled when the user can't mutate the patient. The write is
                    the patient-specific merge operation, independent of the
                    details form (rules › custom fields). No toolbar here, so the
                    tab shows every configured field. */}
                <CustomFieldsEditTab
                  scope="patient"
                  disabled={!editor.canMutate()}
                  values={n().customFields}
                  onSave={saveCustomFields}
                />
              </TabPanel>
              <TabPanel value="log">
                <ActivityLogPanel storeId={params.storeId} recordId={n().id} />
              </TabPanel>

              <InsuranceModal
                open={insuranceState() !== undefined}
                onClose={() => setInsuranceState(undefined)}
                storeId={params.storeId}
                patientId={n().id}
                patientName={n().name}
                providers={providerList()}
                policy={insuranceState()?.policy}
                onSaved={() => void refetchPolicies()}
              />

              <ConfirmDialog
                open={editor.confirmSaveOpen()}
                title={t('heading.are-you-sure')}
                message={t('messages.confirm-save-generic')}
                confirmAction="save"
                onConfirm={() => void editor.doSave(() => void refetch())}
                onClose={() => editor.setConfirmSaveOpen(false)}
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
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default PatientDetailView;
