import { generateUUID } from '../../../../uuid';
import { createSignal, Show, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { DateField } from '../../../../ui/elements/inputs/DateField';
import { localTodayIso } from '../../../../ui/elements/inputs/dateTimeConvert';
import { ToggleSwitch } from '../../../../ui/elements/inputs/ToggleSwitch';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { FormColumns } from '../../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../../ui/layout/Form/FormColumn';
import { FormErrorSummary } from '../../../../ui/layout/Form/FormErrorSummary';
import { createFormValidation } from '../../../../ui/layout/Form/formValidation';
import { SaveIcon, XCircleIcon } from '../../../../ui/icons';
import { runInsertInsurance, runUpdateInsurance } from './insuranceApi';
import type { InsuranceProviderOption } from './insuranceApi';
import type {
  InsurancePolicyFragment,
  InsertInsuranceVariables,
} from './insurance.generated';

type PolicyType = InsertInsuranceVariables['input']['policyType'];

export interface InsuranceModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  /** The patient the policy belongs to (the insert `nameId`). */
  patientId: string;
  /** Seeds the default name-of-the-insured (the patient's display name). */
  patientName: string;
  /** Active providers (already gated non-empty by the tab). */
  providers: InsuranceProviderOption[];
  /** Present ⇒ edit that policy; absent ⇒ add a new one. */
  policy?: InsurancePolicyFragment;
  onSaved: () => void;
}

// The add/edit insurance modal (spec/patients ui-surface › Insurance add/edit
// modal). Two-column form over a local draft, committed on Save behind the
// required-field checks the client relies on (insurance writes carry no typed
// error — prevention, not rejection-handling). The policy-number parts are set
// only at creation, so they are locked when editing (the update input has no
// field for them). Remounts per open via the <Show> wrapper, so the draft is
// always freshly seeded.
export const InsuranceModal: Component<InsuranceModalProps> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

type Draft = {
  nameOfInsured: string;
  policyNumberFamily: string;
  policyNumberPerson: string;
  policyType: PolicyType;
  isActive: boolean;
  expiryDate: string | null;
  insuranceProviderId: string | null;
  /** `undefined` = no rate entered — the required field is genuinely empty. */
  discountPercentage: number | undefined;
};

const Body: Component<InsuranceModalProps> = props => {
  const today = localTodayIso();
  const editing = () => props.policy !== undefined;

  const [draft, setDraft] = createStore<Draft>(
    props.policy
      ? {
          nameOfInsured: props.policy.nameOfInsured ?? '',
          policyNumberFamily: props.policy.policyNumberFamily ?? '',
          policyNumberPerson: props.policy.policyNumberPerson ?? '',
          policyType: props.policy.policyType,
          isActive: props.policy.isActive,
          expiryDate: props.policy.expiryDate,
          insuranceProviderId: props.policy.insuranceProviderId,
          discountPercentage: props.policy.discountPercentage,
        }
      : {
          nameOfInsured: props.patientName,
          policyNumberFamily: '',
          policyNumberPerson: '',
          policyType: 'PERSONAL',
          isActive: true,
          expiryDate: null,
          insuranceProviderId: null,
          discountPercentage: undefined,
        }
  );

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');

  const policyTypeOptions: { value: PolicyType; label: string }[] = [
    { value: 'PERSONAL', label: t('label.personal') },
    { value: 'BUSINESS', label: t('label.business') },
  ];

  // At least one policy number is required (each part required only while the
  // other is empty) — enforced on create; locked (and thus unvalidated) on
  // edit.
  const hasAnyPolicyNumber = () =>
    draft.policyNumberFamily.trim() !== '' ||
    draft.policyNumberPerson.trim() !== '';
  const expiryInPast = () =>
    draft.expiryDate !== null && draft.expiryDate < today;
  // An active policy must carry a non-zero coverage rate (spec AC-I4). Only an
  // entered 0 trips this — an empty field is the required rule's business.
  const activeNeedsCoverage = () =>
    draft.isActive && draft.discountPercentage === 0;

  // Validation (AC-I3/I4). Required errors + the active-needs-coverage rule
  // (which trips on a policy being edited that already carries 0) stay quiet
  // until Save; the past-expiry rule surfaces immediately. The Body remounts
  // per open, so state is fresh.
  const validation = createFormValidation(() => [
    {
      id: 'policyNumberFamily',
      label: t('label.policy-number-family'),
      failed: !editing() && !hasAnyPolicyNumber(),
    },
    {
      id: 'policyNumberPerson',
      label: t('label.policy-number-person'),
      failed: !editing() && !hasAnyPolicyNumber(),
    },
    {
      id: 'insuranceProviderId',
      label: t('label.provider-name'),
      failed: draft.insuranceProviderId === null,
    },
    {
      id: 'expiryDate',
      label: t('label.insurance-expiry-date'),
      failed: expiryInPast(),
      message: t('error.date-in-past'),
    },
    {
      id: 'expiryDate',
      label: t('label.insurance-expiry-date'),
      failed: draft.expiryDate === null,
    },
    {
      id: 'discountPercentage',
      label: t('label.coverage-rate'),
      failed: draft.discountPercentage === undefined,
    },
    {
      id: 'discountPercentage',
      label: t('label.coverage-rate'),
      failed: activeNeedsCoverage(),
      message: t('messages.active-policy-needs-coverage'),
      showOnSubmit: true,
    },
  ]);

  const save = async () => {
    if (saving()) return;
    validation.arm();
    if (!validation.valid()) return;
    setSaving(true);
    setSaveError('');
    const outcome = props.policy
      ? await runUpdateInsurance(props.storeId, {
          id: props.policy.id,
          insuranceProviderId: draft.insuranceProviderId,
          policyType: draft.policyType,
          discountPercentage: draft.discountPercentage!,
          expiryDate: draft.expiryDate,
          isActive: draft.isActive,
          nameOfInsured: draft.nameOfInsured,
        })
      : await runInsertInsurance(props.storeId, {
          id: generateUUID(),
          nameId: props.patientId,
          insuranceProviderId: draft.insuranceProviderId!,
          policyNumberFamily: draft.policyNumberFamily,
          policyNumberPerson: draft.policyNumberPerson,
          policyType: draft.policyType,
          discountPercentage: draft.discountPercentage!,
          expiryDate: draft.expiryDate!,
          isActive: draft.isActive,
          nameOfInsured: draft.nameOfInsured,
        });
    setSaving(false);
    if (!outcome) return props.onClose(); // handled globally
    if (outcome.kind === 'error') {
      setSaveError(outcome.message);
      return;
    }
    props.onSaved();
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      title={editing() ? t('title.edit-insurance') : t('title.new-insurance')}
      testId="insurance-modal"
      actionsLead={
        <Show when={saveError()}>
          <Alert severity="error">{saveError()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            confirms="cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<SaveIcon />}
            confirms="plain"
            data-testid="dialog-button-ok"
            loading={saving()}
            onClick={() => void save()}
          >
            {t('button.save')}
          </Button>
        </>
      }
    >
      <FormColumns>
        <FormColumn>
          <TextField
            label={t('label.name-of-the-insured')}
            width="full"
            value={draft.nameOfInsured}
            onInput={e => setDraft('nameOfInsured', e.currentTarget.value)}
          />
          <TextField
            label={t('label.policy-number-family')}
            width="full"
            required={!editing() && draft.policyNumberPerson.trim() === ''}
            disabled={editing()}
            error={validation.errorFor('policyNumberFamily')}
            value={draft.policyNumberFamily}
            onInput={e => setDraft('policyNumberFamily', e.currentTarget.value)}
          />
          <TextField
            label={t('label.policy-number-person')}
            width="full"
            required={!editing() && draft.policyNumberFamily.trim() === ''}
            disabled={editing()}
            error={validation.errorFor('policyNumberPerson')}
            value={draft.policyNumberPerson}
            onInput={e => setDraft('policyNumberPerson', e.currentTarget.value)}
          />
          <Combobox<{ value: PolicyType; label: string }>
            label={t('label.policy-type')}
            items={policyTypeOptions}
            itemToString={o => o.label}
            itemToValue={o => o.value}
            clearable={false}
            value={draft.policyType}
            onChange={o => o && setDraft('policyType', o.value)}
          />
          <ToggleSwitch
            label={t('label.insurance-active')}
            checked={draft.isActive}
            onChange={checked => setDraft('isActive', checked)}
          />
        </FormColumn>
        <FormColumn>
          <DateField
            label={t('label.insurance-expiry-date')}
            width="full"
            min={today}
            value={draft.expiryDate}
            error={validation.errorFor('expiryDate')}
            onChange={value => setDraft('expiryDate', value)}
          />
          <Combobox<InsuranceProviderOption>
            label={t('label.provider-name')}
            items={props.providers}
            itemToString={p => p.providerName}
            itemToValue={p => p.id}
            clearable={false}
            error={validation.errorFor('insuranceProviderId')}
            value={draft.insuranceProviderId ?? undefined}
            onChange={p => setDraft('insuranceProviderId', p?.id ?? null)}
          />
          <NumberField
            label={t('label.coverage-rate')}
            width="full"
            required
            min={0}
            max={100}
            decimalLimit={2}
            endAdornment="%"
            value={draft.discountPercentage}
            error={validation.errorFor('discountPercentage')}
            onChange={value => setDraft('discountPercentage', value)}
          />
        </FormColumn>
      </FormColumns>
      <FormErrorSummary
        errors={validation.visible()}
        testId="insurance-error-summary"
      />
    </Dialog>
  );
};
