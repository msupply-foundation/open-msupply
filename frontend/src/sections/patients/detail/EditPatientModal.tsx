import { createResource, createSignal, Show, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import { EditIcon } from '../../../ui/icons';
import { createAddAction } from '../../../ui/utils/keyActions';
import { FormErrorSummary } from '../../../ui/layout/Form/FormErrorSummary';
import { CustomFieldsEditTab } from '../../../domain/customFields';
import { runUpdatePatientCustomFields } from '../patientApi';
import { Patient, type PatientVariables } from './patient.generated';
import { createPatientEditor } from './patientEditor';
import { PatientDetailsForm } from './PatientDetailsForm';
import { InsurancePanel } from './insurance/InsurancePanel';
import { InsuranceModal } from './insurance/InsuranceModal';
import {
  fetchInsuranceProviders,
  fetchInsurancePolicies,
} from './insurance/insuranceApi';
import type { InsurancePolicyFragment } from './insurance/insurance.generated';

export interface EditPatientModalProps {
  storeId: string;
  patientId: string;
  onClose: () => void;
  /** A save landed — the caller refetches whatever shows the patient's name. */
  onSaved?: () => void;
}

type ModalTab = 'details' | 'insurance' | 'custom-fields';

/**
 * The patient picker's edit-patient modal (spec/patients S4 allow-edit): a
 * **Patient details** / **Insurance** / **Custom fields** dialog reusing the S3
 * Details form and the shared custom-fields editor, opened from any surface
 * that holds a patient without navigating away from it — the prescription
 * header's picker and the prescription-request header's (PatientSearch's
 * `onEditPatient`, spec/prescriptions ui-surface S3 § header fields; #1038).
 *
 * Custom fields earn a tab here because standing facts about the person —
 * Category among them — are captured mid-prescribing, and sending the
 * prescriber to the full patient screen to set one would lose the request they
 * are in the middle of authoring. The tab owns its own explicit Save (the
 * patient-specific merge write), independent of the footer's details Save,
 * exactly as the full patient screen's tab does.
 *
 * Mounted fresh per open (the stocktakes/PrescriptionLineEditModal shape — a
 * call site keys it to the id it's opened for) so the edit state always starts
 * clean; there is no reopen-with-stale-draft case to guard against.
 *
 * The patient fetch is interaction-triggered UNDER an already-open screen (the
 * caller's own page or dialog), so it is read through the `.state` gate, never
 * `.latest` alone — a suspending read would tear down that screen mid-click
 * (kdd/solid-reactivity-pitfalls › no remounts on interaction). The draft,
 * validation and save reuse `createPatientEditor` — the same rules the full
 * detail page's Details tab runs, so the two surfaces can't drift apart.
 */
export const EditPatientModal: Component<EditPatientModalProps> = props => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = createSignal<ModalTab>('details');

  const [data] = createResource(
    () => ({ storeId: props.storeId, patientId: props.patientId }),
    async (variables: PatientVariables) => {
      const result = await graphqlFetch(Patient, variables);
      return result.kind === 'success'
        ? (result.data.patient ?? undefined)
        : undefined;
    }
  );
  const node = () => gated(data);

  const editor = createPatientEditor({ storeId: () => props.storeId, node });

  // Insurance tab — identical shape to PatientDetailView's (gated on the site
  // having at least one configured provider; policies load only once the tab
  // can show).
  const [providers] = createResource(
    () => props.storeId,
    fetchInsuranceProviders
  );
  const providerList = () => gated(providers) ?? [];
  const hasInsurance = () => providerList().length > 0;

  const [insuranceState, setInsuranceState] = createSignal<{
    policy?: InsurancePolicyFragment;
  }>();

  const [policiesData, { refetch: refetchPolicies }] = createResource(
    () =>
      hasInsurance()
        ? { storeId: props.storeId, nameId: props.patientId }
        : undefined,
    fetchInsurancePolicies
  );
  const policies = () => gated(policiesData) ?? [];

  // Alt+N while this modal is open and the Insurance tab is active — the same
  // registration PatientDetailView makes; mounted-fresh-per-open means plain
  // unmount cleanup is enough to hand the binding back (no surfaceActive gate
  // needed, since this component is never kept mounted-but-hidden).
  createAddAction({
    name: 'button.add-insurance',
    run: () => setInsuranceState({}),
    disabled: () => activeTab() !== 'insurance' || !editor.canMutate(),
  });

  const patientName = () => node()?.name ?? '';

  // Save persists then closes back to the caller's screen (D54's modal-in-place
  // idiom) — the caller's onSaved lets it refetch whatever shows the patient's
  // name (e.g. the prescription header).
  const afterSave = () => {
    props.onSaved?.();
    props.onClose();
  };

  // Custom-fields merge write (spec/patients AC-CF1–CF3) — the same call the
  // full patient screen's tab makes. Sends only the changed keys; a cleared
  // field is sent as `null` (never '', which would persist a literal empty
  // value — AC-CF2). Returns true on success so the tab clears its dirty state.
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const customFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      customFields[key] = value === '' || value === undefined ? null : value;
    }
    const outcome = await runUpdatePatientCustomFields(props.storeId, {
      id: props.patientId,
      customFields,
    });
    return outcome?.kind === 'ok';
  };

  // The escape hatch to the full patient screen (spec/patients S4: "Save and
  // View patient actions") — for everything this modal doesn't cover
  // (Programs / Encounters / Vaccinations / Log).
  const viewPatient = () => {
    props.onClose();
    navigate(`/${props.storeId}/dispensary/patients/${props.patientId}`);
  };

  return (
    <>
      <Dialog
        open
        title={patientName()}
        icon={<EditIcon />}
        width="form"
        minBodyHeightRem={34}
        testId="edit-patient-modal"
        dismissable={!editor.saving()}
        onClose={props.onClose}
        actions={
          <>
            <CancelButton
              data-testid="dialog-button-cancel"
              disabled={editor.saving()}
              onClick={props.onClose}
            />
            <Button
              variant="secondary"
              data-testid="view-patient-button"
              disabled={editor.saving()}
              onClick={viewPatient}
            >
              {t('button.view-patient')}
            </Button>
            <Show when={editor.canMutate()}>
              <DialogSaveButton
                data-testid="dialog-button-save"
                loading={editor.saving()}
                disabled={!editor.isDirty() || editor.saving()}
                onClick={() => void editor.attemptSave()}
              />
            </Show>
          </>
        }
      >
        <Show when={node()} fallback={<Spinner center />}>
          <Tabs
            value={activeTab()}
            onValueChange={value => setActiveTab(value as ModalTab)}
          >
            <TabList
              tabs={[
                { value: 'details', label: t('label.patient-details') },
                ...(hasInsurance()
                  ? [{ value: 'insurance', label: t('label.insurance') }]
                  : []),
                { value: 'custom-fields', label: t('label.custom-fields') },
              ]}
            />
            <TabPanel value="details">
              <ContentContainer size="form" padded>
                <Show when={editor.saveError()}>
                  <Alert severity="error">{editor.saveError()}</Alert>
                </Show>
                <PatientDetailsForm
                  storeId={props.storeId}
                  patientId={props.patientId}
                  draft={editor.edit}
                  setField={editor.setField}
                  disabled={!editor.canMutate()}
                  errorFor={editor.validation.errorFor}
                />
                <FormErrorSummary
                  errors={editor.validation.visible()}
                  testId="edit-patient-error-summary"
                />
              </ContentContainer>
            </TabPanel>
            <Show when={hasInsurance()}>
              <TabPanel value="insurance">
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
              {/* No toolbar on this surface, so the tab shows every configured
                  field — the full patient screen's tab renders identically. */}
              <ContentContainer size="form" padded>
                <CustomFieldsEditTab
                  scope="patient"
                  disabled={!editor.canMutate()}
                  values={node()?.customFields}
                  onSave={saveCustomFields}
                />
              </ContentContainer>
            </TabPanel>
          </Tabs>
        </Show>
      </Dialog>

      <InsuranceModal
        open={insuranceState() !== undefined}
        onClose={() => setInsuranceState(undefined)}
        storeId={props.storeId}
        patientId={props.patientId}
        patientName={patientName()}
        providers={providerList()}
        policy={insuranceState()?.policy}
        onSaved={() => void refetchPolicies()}
      />

      <ConfirmDialog
        open={editor.confirmSaveOpen()}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-save-generic')}
        confirmAction="save"
        onConfirm={() => void editor.doSave(afterSave)}
        onClose={() => editor.setConfirmSaveOpen(false)}
      />
    </>
  );
};
