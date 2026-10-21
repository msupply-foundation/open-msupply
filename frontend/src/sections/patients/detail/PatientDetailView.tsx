import {
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
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
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_N } from '../../../ui/utils/shortcuts';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { PlusCircleIcon, SaveIcon, XCircleIcon } from '../../../ui/icons';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { createConfirmOnLeave } from '../../../domain/confirmOnLeave';
import { genderLabel } from '../../../domain/patient';
import { runUpdatePatientCustomFields } from '../patientApi';
import {
  CustomFieldsEditTab,
  EMPTY_FIELD_VALUE,
} from '../../../domain/customFields';
import { createPatientDetails } from './patientDetails';
import { PatientDetailsBody } from './PatientDetailsBody';
import { PatientToolbarTriggers } from '../../../plugins/PatientToolbarTriggers';
import { recordPluginDiagnostic } from '../../../plugins/diagnostics';
import type { FormRegistryFragment } from '../../../domain/documentForm/documentForm.generated';
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
  fetchFormRegistries,
  fetchPatientProgramEnrolments,
  fetchPatientEncounters,
} from './programs/programsApi';
import { ProgramPickerDialog } from '@/sections/program-enrolment/ProgramPickerDialog';
import {
  fetchImmunisationContexts,
  programsToOffer,
} from '@/sections/program-enrolment/programEnrolmentApi';
import {
  EnrolmentModal,
  type EnrolmentTarget,
} from '@/sections/program-enrolment/EnrolmentModal';
import {
  CreateEncounterDialog,
  type CreatedEncounter,
} from './programs/CreateEncounterDialog';
import { EncounterFormModal } from './programs/EncounterFormModal';
import { patientPreferences } from '../../../store/storeContext';

// S3 — the patient detail screen (spec/patients). Summary header + tabs
// (Details / Programs / Encounters / Vaccinations / Insurance / Log). The
// Details tab edits the patient on one of two paths (spec/patients rules › two
// persistence paths), buffered locally and committed on an explicit Save behind
// a confirmation, with a discard prompt when leaving dirty (the
// StockLineDetailView model). With a Patient registry entry installed it is the
// document path: the patient document in the document form host, its body the
// plugin form contributed to `patient.form` or the host's default patient form.
// Without one it is the plain-path built-in form. The Insurance tab lists the
// patient's policies and adds/edits them (gated on configured providers). The
// Programs / Encounters / Vaccinations tabs are lists gated on the program
// module: a Programs row opens the enrolment (spec/program-enrolment, whose
// picker and enrolment live in sections/program-enrolment/), an Encounters row
// navigates to the encounter's record screen, and a Vaccinations row opens that
// enrolment's vaccination card (spec/vaccination-card S1; OMS-REG-DIS-02.52).
// Under the program module the header's split button carries the record-create
// actions, New program and New encounter, beside Add insurance. The Log tab
// reuses the shared activity-log surface.
//
// The header also carries the triggers plugins contribute to
// `patient.toolbarTrigger`; `openDocumentForm` opens a new encounter in the
// encounter form modal.
//
// NOT built here: the Contact-tracing tab.
//
// TO-DO: New encounter and the encounter screens are still unspecced; the
// record-screen spec (implementation-plan H26, #789) brings them into spec.

const PatientDetailView: Component = () => {
  const params = useParams<{ storeId: string; patientId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams<{ tab?: string }>();

  const activeTab = () => searchParams.tab ?? 'details';
  const setActiveTab = (value: string) =>
    setSearchParams({ tab: value === 'details' ? undefined : value });

  // The patient read and the Details tab, on the plain path or the document
  // path as the store's Patient registry entry says (spec/patients rules ›
  // two persistence paths) — shared with the picker's edit modal, so neither
  // surface can drift on these rules or write the record under a document
  // (patientDetails.ts). On the document path the one read carries the
  // document and its draft, so the form follows at once.
  const patientDetails = createPatientDetails({
    storeId: () => params.storeId,
    patientId: () => params.patientId,
  });
  // The screen's own read suspends for its first load (the Suspense below);
  // everything under it reads the patient through patientDetails.node.
  const { patient: data, refetch } = patientDetails;
  const node = () => data.latest ?? undefined;
  const editor = patientDetails.editor;
  const details = patientDetails.active;

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

  // Alt+N — this screen's add action (spec/keyboard KB-R2,
  // OMS-REG-KBD-01.14/.15). Declared by the SCREEN, once, for the two controls
  // that trigger it (the app-bar button and the ghost button in the Insurance
  // panel's empty slot); each carries `shortcut={ALT_N}` for its badge.
  //
  // Disabled — and so unlisted in the palette — except on the Insurance tab
  // with the mutate permission, which is exactly when either control renders.
  // KB-R2's "unclaimed only where the thing is absent": on the Details tab this
  // screen has no add action, so nothing here answers the key.
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

  const [enrolmentsData, { refetch: refetchEnrolments }] = createResource(
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

  const [encountersData, { refetch: refetchEncounters }] = createResource(
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

  // The record-create actions, over the registry entries the server lets this
  // user see: every enrolment type, and the encounter types of the programs the
  // patient is enrolled in, since the server refuses an encounter in any other
  // program.
  const [registriesData] = createResource(
    () => (hasProgramModule() ? params.storeId : undefined),
    fetchFormRegistries
  );
  const registries = () => gated(registriesData) ?? [];
  const enrolmentRegistries = () =>
    registries().filter(r => r.category === 'PROGRAM_ENROLMENT');
  // New program from the Vaccinations tab offers only immunisation programs
  // (spec/program-enrolment rules § enrolling a patient); until their
  // contexts are read, or if the read fails, it offers every program.
  const [immunisationContexts] = createResource(
    () => (hasProgramModule() ? params.storeId : undefined),
    fetchImmunisationContexts
  );
  const [pickerImmunisationOnly, setPickerImmunisationOnly] =
    createSignal(false);
  const pickerRegistries = () =>
    programsToOffer(
      enrolmentRegistries(),
      pickerImmunisationOnly(),
      gated(immunisationContexts)
    );
  const enrolledTypes = () => new Set(enrolments().map(e => e.type));
  const encounterRegistries = () => {
    const contexts = new Set(enrolments().map(e => e.contextId));
    return registries().filter(
      r => r.category === 'ENCOUNTER' && contexts.has(r.contextId)
    );
  };
  const canAddEncounter = () => enrolments().length > 0;

  // A trigger's `openDocumentForm`: a new encounter of a type in a program the
  // patient is enrolled in, which is all the server accepts. Anything else is
  // refused and named against the plugin that asked.
  const [encounterFormType, setEncounterFormType] =
    createSignal<FormRegistryFragment>();
  const openDocumentForm = (documentType: string, pluginCode: string) => {
    const registry = encounterRegistries().find(
      r => r.documentType === documentType
    );
    if (!registry) {
      recordPluginDiagnostic({
        level: 'warning',
        pluginCode,
        message: `patient.toolbarTrigger: openDocumentForm("${documentType}") refused — not an encounter type of a program this patient is enrolled in`,
      });
      return;
    }
    setEncounterFormType(registry);
  };

  const [pickerOpen, setPickerOpen] = createSignal(false);
  const [enrolmentTarget, setEnrolmentTarget] = createSignal<EnrolmentTarget>();
  const [createEncounterOpen, setCreateEncounterOpen] = createSignal(false);

  // A visit starting within the next five minutes is being recorded now, so
  // its record screen opens (the old client's rule); a later one has been
  // scheduled, and the patient's encounter list shows it.
  const encounterCreated = (created: CreatedEncounter) => {
    setCreateEncounterOpen(false);
    const soon = Date.now() + 5 * 60 * 1000;
    if (new Date(created.startDatetime).getTime() <= soon) {
      openEncounter({ id: created.encounterId });
      return;
    }
    setActiveTab('encounters');
    void refetchEncounters();
  };

  type CreateAction = 'new-program' | 'new-encounter' | 'add-insurance';
  const canAddInsurance = () => hasInsurance() && editor.canMutate();
  const createOptions = () => [
    { value: 'new-program', label: t('button.new-program') },
    {
      value: 'new-encounter',
      label: t('button.new-encounter'),
      disabled: !canAddEncounter(),
      title: t('messages.enrol-before-encounter'),
    },
    ...(canAddInsurance()
      ? [{ value: 'add-insurance', label: t('button.add-insurance') }]
      : []),
  ];
  // The split button's main action follows the tab (spec/patients ui-surface
  // S3 layout): the tab's own record kind, else New program.
  const tabAction = (): CreateAction => {
    if (activeTab() === 'insurance' && canAddInsurance())
      return 'add-insurance';
    if (activeTab() === 'encounters' && canAddEncounter()) {
      return 'new-encounter';
    }
    return 'new-program';
  };
  const runCreate = (action: string) => {
    if (action === 'new-program') {
      setPickerImmunisationOnly(activeTab() === 'vaccinations');
      setPickerOpen(true);
    } else if (action === 'new-encounter' && canAddEncounter()) {
      setCreateEncounterOpen(true);
    } else if (action === 'add-insurance' && canAddInsurance()) {
      setInsuranceState({});
    }
  };

  const leave = () => navigate(`/${params.storeId}/dispensary/patients`);

  // Discard prompt on any leave from a dirty form (spec § patient edit form):
  // route change, tab switch, browser back, reload / tab close. onDiscard
  // resets the draft so a tab switch — which stays mounted — is truly cleared.
  const leaveGuard = createConfirmOnLeave({
    isDirty: () => details().isDirty(),
    onDiscard: () => details().resetDraft(),
  });

  const displayName = () => node()?.name || t('label.new-patient');

  const crumbs = () => [
    { label: t('label.patients'), onClick: leave },
    { label: displayName() },
  ];

  // Custom-fields merge write (spec/patients OMS-REG-DIS-02.45–.47). Sends only
  // the changed keys; a cleared field is sent as `null` (never '', which would
  // persist a literal empty value — OMS-REG-DIS-02.46). Returns true on success
  // so the edit tab clears its dirty state.
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
                  {/* The app-bar page actions (spec ui-surface S3 layout). Under
                      the program module, one split button of record-create
                      actions whose main action follows the tab; without it,
                      Add insurance alone, on the Insurance tab. Add insurance
                      is gated on providers being configured + patient-mutate
                      and opens the modal in add mode either way. */}
                  <HeaderButtons>
                    <PatientToolbarTriggers
                      props={{
                        patient: {
                          id: n().id,
                          enrolmentTypes: enrolments().map(e => e.type),
                        },
                      }}
                      openDocumentForm={openDocumentForm}
                    />
                    <Show
                      when={hasProgramModule()}
                      fallback={
                        <Show
                          when={
                            activeTab() === 'insurance' && editor.canMutate()
                          }
                        >
                          <Button
                            icon={<PlusCircleIcon />}
                            shortcut={ALT_N}
                            data-testid="add-insurance-header-button"
                            onClick={() => setInsuranceState({})}
                          >
                            {t('button.add-insurance')}
                          </Button>
                        </Show>
                      }
                    >
                      <SplitButton
                        icon={<PlusCircleIcon />}
                        options={createOptions()}
                        value={tabAction()}
                        onAction={runCreate}
                        menuLabel={t('button.create')}
                        shortcut={
                          tabAction() === 'add-insurance' ? ALT_N : undefined
                        }
                        testId="patient-create-split-button"
                      />
                    </Show>
                  </HeaderButtons>
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
                        {details().isDirty()
                          ? t('button.cancel')
                          : t('button.close')}
                      </Button>
                      <Show when={details().canMutate()}>
                        <Button
                          icon={<SaveIcon />}
                          data-testid="save-button"
                          loading={details().saving()}
                          disabled={!patientDetails.canSave()}
                          onClick={() => void details().attemptSave()}
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
                  <PatientDetailsBody
                    storeId={params.storeId}
                    patientId={params.patientId}
                    details={patientDetails}
                    errorSummaryTestId="patient-detail-error-summary"
                  />
                </ContentContainer>
              </TabPanel>
              <Show when={hasProgramModule()}>
                {/* Program-module lists. Programs + Vaccinations share the
                    enrolment table (Vaccinations = immunisation subset). A
                    Programs row opens its enrolment in the modal; a
                    Vaccinations row opens its vaccination card. Encounters
                    rows navigate to the encounter screen. */}
                <TabPanel value="programs">
                  <ProgramEnrolmentsPanel
                    rows={enrolments()}
                    loading={enrolmentsData.loading}
                    tableId="patient-program-enrolment-list"
                    emptyMessage={t('messages.no-programs')}
                    onRowClick={row =>
                      setEnrolmentTarget({
                        kind: 'existing',
                        documentName: row.name,
                      })
                    }
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
                    onRowClick={row =>
                      navigate(
                        `/${params.storeId}/dispensary/patients/${params.patientId}/vaccination-card/${row.id}`
                      )
                    }
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
                {/* Custom fields (spec/patients ui-surface; write path OMS-REG-DIS-02.45–.47).
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

              <ProgramPickerDialog
                open={pickerOpen()}
                registries={pickerRegistries()}
                enrolledTypes={enrolledTypes()}
                onPick={registry => {
                  setPickerOpen(false);
                  setEnrolmentTarget({ kind: 'new', registry });
                }}
                onClose={() => setPickerOpen(false)}
              />
              <EnrolmentModal
                storeId={params.storeId}
                patientId={n().id}
                target={enrolmentTarget()}
                onClose={() => setEnrolmentTarget(undefined)}
                onSaved={() => {
                  setActiveTab('programs');
                  void refetchEnrolments();
                }}
              />
              <CreateEncounterDialog
                open={createEncounterOpen()}
                storeId={params.storeId}
                patientId={n().id}
                registries={encounterRegistries()}
                defaultType={encounters()[0]?.type}
                onCreated={encounterCreated}
                onClose={() => setCreateEncounterOpen(false)}
              />
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

              <EncounterFormModal
                storeId={params.storeId}
                patientId={n().id}
                registry={encounterFormType()}
                onClose={() => setEncounterFormType(undefined)}
                onSaved={() => {
                  void refetchEncounters();
                  void refetchEnrolments();
                }}
              />

              <ConfirmDialog
                open={details().confirmSaveOpen()}
                title={t('heading.are-you-sure')}
                message={t('messages.confirm-save-generic')}
                confirmAction="save"
                onConfirm={() => void details().doSave(() => void refetch())}
                onClose={() => details().setConfirmSaveOpen(false)}
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
