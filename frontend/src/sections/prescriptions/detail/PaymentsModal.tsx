import {
  createMemo,
  createResource,
  createSignal,
  type Component,
} from 'solid-js';
import { t } from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { CurrencyField } from '../../../ui/elements/inputs/CurrencyField';
import { Text } from '../../../ui/elements/typography/Text';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { formatNumber } from '../../../intl';
import {
  InsurancePolicies,
  type InsurancePoliciesResult,
} from './insurance.generated';
import type { UpdateInput } from './prescriptionUpdate';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

// The payment window (spec/prescriptions/ui-surface.md S5; AC-Y1/Y2): opened
// by the status confirmation when insurance providers exist and the total is
// charged. Total to be paid (read-only) · Insurance policy (the patient's
// ACTIVE, unexpired policies — patients-owned records) · Discount rate ·
// Paid by insurance (derived). Confirming hands the policy + discount fields
// to the status change so they save together; cancelling leaves the status
// untouched.

type Policy = NonNullable<
  InsurancePoliciesResult['insurancePolicies']['nodes']
>[number];

export interface PaymentsModalProps {
  storeId: string;
  node: PrescriptionFieldsFragment;
  working: boolean;
  onClose: () => void;
  /** Confirm: the payment fields ride the status update (one operation). */
  onConfirm: (extra: Partial<UpdateInput>) => void;
}

export const PaymentsModal: Component<PaymentsModalProps> = props => {
  const [policyId, setPolicyId] = createSignal<string>();

  // The patient's policies, fetched when the window opens (it mounts per
  // open); only active, unexpired ones are offered (AC-Y2).
  const [policiesData] = createResource(
    () => ({ storeId: props.storeId, nameId: props.node.patient?.id ?? '' }),
    async variables => {
      if (!variables.nameId) return [];
      const result = await graphqlFetch(InsurancePolicies, variables);
      return result.kind === 'success'
        ? result.data.insurancePolicies.nodes
        : undefined;
    }
  );
  const today = localTodayIso();
  // State-gated (never suspends) — the window first-fetches while open.
  const policies = (): Policy[] =>
    (
      (policiesData.state === 'ready' || policiesData.state === 'refreshing'
        ? policiesData.latest
        : undefined) ?? []
    ).filter(policy => policy.isActive && policy.expiryDate >= today);

  const selected = () => policies().find(policy => policy.id === policyId());
  const total = () => props.node.pricing.totalAfterTax;
  const covered = createMemo(() => {
    const policy = selected();
    return policy ? (total() * policy.discountPercentage) / 100 : 0;
  });

  const confirm = () => {
    const policy = selected();
    props.onConfirm(
      policy
        ? {
            nameInsuranceJoinId: { value: policy.id },
            insuranceDiscountPercentage: policy.discountPercentage,
            insuranceDiscountAmount: covered(),
          }
        : {}
    );
  };

  return (
    <Dialog
      open
      dismissable={!props.working}
      onClose={props.onClose}
      title={t('title.payment')}
      testId="payments-modal"
      actions={
        <>
          <Button variant="secondary" confirms="cancel" onClick={props.onClose}>
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            loading={props.working}
            onClick={confirm}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <FieldRow label={t('label.total-to-be-paid')}>
        <CurrencyField
          label={t('label.total-to-be-paid')}
          hideLabel
          value={total()}
          readonly
          onChange={() => undefined}
        />
      </FieldRow>
      <FieldRow label={t('label.insurance-policy')}>
        <Combobox<Policy>
          label={t('label.insurance-policy')}
          hideLabel
          items={policies()}
          loading={policiesData.loading}
          itemToString={policy => policy.policyNumber}
          itemToValue={policy => policy.id}
          value={policyId()}
          clearable
          onChange={policy => setPolicyId(policy?.id)}
        />
      </FieldRow>
      <FieldRow label={t('label.discount-rate')}>
        <Text variant="body">
          {(policy =>
            policy ? `${formatNumber(policy.discountPercentage)}%` : '—')(
            selected()
          )}
        </Text>
      </FieldRow>
      <FieldRow label={t('label.paid-by-insurance')}>
        <CurrencyField
          label={t('label.paid-by-insurance')}
          hideLabel
          value={covered()}
          readonly
          onChange={() => undefined}
        />
      </FieldRow>
    </Dialog>
  );
};
