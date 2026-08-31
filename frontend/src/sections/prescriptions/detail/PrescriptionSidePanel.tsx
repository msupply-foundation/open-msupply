import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { t } from '../../../intl';
import { genderLabel } from '@/domain/patient';
import { localisedDate } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl';
import {
  SidePanelSection,
  SidePanelActions,
} from '../../../ui/layout/SidePanel/SidePanel';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { UserLabel } from '../../../ui/elements/typography/UserLabel';
import { Text } from '../../../ui/elements/typography/Text';
import { Button } from '../../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import { MinusCircleIcon, TrashIcon } from '../../../ui/icons';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { CurrencyField } from '../../../ui/elements/inputs/CurrencyField';
import {
  canCancelPrescription,
  canDeletePrescription,
  asPrescriptionStatus,
} from '../prescriptionStatus';
import {
  DeletePrescription,
  DiagnosesActive,
  SourcePrescriptionRequest,
  type PrescriptionFieldsFragment,
  type DiagnosesActiveResult,
} from './prescriptionDetail.generated';
import type { UpdateInput } from './prescriptionUpdate';
import type { DebouncedEdit } from '../../../domain/debouncedEdit';
import { createResource } from 'solid-js';

// The detail side panel (spec/prescriptions/ui-surface.md S3 § side panel):
// Prescription details (Reference) · Additional info (Entered by / Created /
// Colour / Comment) · Pricing (insurance block when a policy is attached,
// always the Grand total) · Patient details (name / code / DOB / gender /
// insurance status / Diagnosis) — then the pinned record actions: Delete
// (while deletable, AC-D1/D2), Cancel prescription (VERIFIED only, permission
// affordance gate, AC-X1/X4), Copy to clipboard.

export interface PrescriptionEditFields {
  theirReference: string;
  comment: string;
}

export interface PrescriptionSidePanelProps {
  storeId: string;
  node: PrescriptionFieldsFragment;
  disabled: boolean;
  /** The shared debounced edit buffer (reference + comment). */
  edit: DebouncedEdit<PrescriptionEditFields>;
  /** Whether the store has insurance providers (the insurance-status gate). */
  hasInsuranceProviders: boolean;
  /** The patient's active policy count (for the insured/not-insured row). */
  patientPolicyCount: number | undefined;
  /** The cancel affordance's permission gate (AC-X4 — client-side only). */
  canCancelPermission: boolean;
  onSave: (input: Omit<UpdateInput, 'id'>) => void;
  /** Cancel the prescription (VERIFIED → CANCELLED). */
  onCancel: () => void;
  onDeleted: () => void;
}

type Diagnosis = DiagnosesActiveResult['diagnosesActive'][number];

export const PrescriptionSidePanel: Component<
  PrescriptionSidePanelProps
> = props => {
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = createSignal(false);
  const [cancelConfirm, setCancelConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  const status = () => asPrescriptionStatus(props.node.status);

  // The active diagnoses the Diagnosis picker offers (the picker is the only
  // guard — an unknown id fails opaquely, contract wire trap). Read
  // non-suspending: the panel lives under the already-open detail.
  const [diagnoses] = createResource(async () => {
    const result = await graphqlFetch(DiagnosesActive, {});
    return result.kind === 'success' ? result.data.diagnosesActive : undefined;
  });

  const runDelete = async () => {
    setDeleting(true);
    const result = await graphqlFetch(DeletePrescription, {
      storeId: props.storeId,
      id: props.node.id,
    });
    setDeleting(false);
    if (result.kind !== 'success') return;
    if ('id' in result.data.deletePrescription) props.onDeleted();
  };

  const insurance = () => props.node.insurancePolicy;

  // The prescription request this dispensation was generated from (AC-R4's
  // other direction). Keyed on the soft link, so it only fetches for a
  // generated prescription. The request genuinely may not be here — it is
  // RemoteOwned while the invoice is patient-distributed, so a second site
  // holding this invoice has the link but not its target — and that answers
  // RecordNotFound, which is a member of the union rather than an error. It
  // has to be told apart by `__typename`: without that it deserialises to `{}`
  // and reads as a node whose every field is undefined. Read non-suspending —
  // the panel lives under the already-open detail.
  const [sourceRequest] = createResource(
    () => props.node.prescriptionRequestId ?? undefined,
    async id => {
      const result = await graphqlFetch(SourcePrescriptionRequest, {
        storeId: props.storeId,
        id,
      });
      if (result.kind !== 'success') return undefined;
      const request = result.data.prescriptionRequest;
      return request?.__typename === 'PrescriptionRequestNode'
        ? request
        : undefined;
    }
  );
  const sourceRequestNode = () => gated(sourceRequest);

  return (
    <>
      <SidePanelSection
        value="prescription-details"
        title={t('heading.prescription-details')}
        collapsible
      >
        <FieldRow label={t('label.reference')}>
          <TextField
            label={t('label.reference')}
            hideLabel
            data-testid="customer-reference-field"
            value={props.edit.state.theirReference}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('theirReference', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      <SidePanelSection
        value="additional-info"
        title={t('heading.additional-info')}
        collapsible
      >
        <FieldRow label={t('label.entered-by')}>
          <UserLabel
            username={props.node.user?.username}
            email={props.node.user?.email}
            label={t('label.entered-by')}
            testId="entered-by-field"
          />
        </FieldRow>
        <FieldRow label={t('label.created')}>
          <Text variant="body">
            {localisedDate(props.node.createdDatetime)}
          </Text>
        </FieldRow>
        <FieldRow label={t('label.color')}>
          <ColourTagPicker
            colour={props.node.colour ?? null}
            variant="field"
            label={t('label.color')}
            onSelect={
              props.disabled
                ? () => undefined
                : colour => props.onSave({ colour })
            }
          />
        </FieldRow>
        <FieldRow label={t('heading.comment')}>
          <TextArea
            label={t('heading.comment')}
            hideLabel
            data-testid="comment-field"
            rows={3}
            value={props.edit.state.comment}
            disabled={props.disabled}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      <SidePanelSection
        value="pricing"
        title={t('heading.pricing')}
        collapsible
      >
        <Show when={insurance()}>
          {policy => (
            <>
              <FieldRow label={t('label.provider-name')}>
                <Text variant="body">
                  {policy().insuranceProviders?.providerName ?? '—'}
                </Text>
              </FieldRow>
              <FieldRow label={t('label.policy-number')}>
                <Text variant="body">{policy().policyNumber}</Text>
              </FieldRow>
              <FieldRow label={t('label.discount-amount')}>
                <CurrencyField
                  label={t('label.discount-amount')}
                  hideLabel
                  value={props.node.insuranceDiscountAmount ?? 0}
                  readonly
                  onChange={() => undefined}
                />
              </FieldRow>
              <FieldRow label={t('label.discount-percentage')}>
                <Text variant="body">
                  {formatNumber(props.node.insuranceDiscountPercentage ?? 0)}%
                </Text>
              </FieldRow>
            </>
          )}
        </Show>
        <FieldRow label={t('heading.grand-total')}>
          <CurrencyField
            label={t('heading.grand-total')}
            hideLabel
            value={props.node.pricing.totalAfterTax}
            readonly
            onChange={() => undefined}
          />
        </FieldRow>
      </SidePanelSection>

      <SidePanelSection
        value="patient-details"
        title={t('heading.patient-details')}
        collapsible
      >
        <FieldRow label={t('label.patient-name')}>
          <Text variant="body">{props.node.patient?.name ?? '—'}</Text>
        </FieldRow>
        <FieldRow label={t('label.code')}>
          <Text variant="body">{props.node.patient?.code ?? '—'}</Text>
        </FieldRow>
        <FieldRow label={t('label.date-of-birth')}>
          <Text variant="body">
            {props.node.patient?.dateOfBirth
              ? localisedDate(props.node.patient.dateOfBirth)
              : '—'}
          </Text>
        </FieldRow>
        <FieldRow label={t('label.gender')}>
          {/* Rendered through the patients gender labels (spec/patients S5) —
              the reference app shows the raw value here; the spec adopts the
              patients rule (prescriptions ui-surface § side panel). */}
          <Text variant="body">
            {props.node.patient?.gender
              ? genderLabel(props.node.patient.gender)
              : '—'}
          </Text>
        </FieldRow>
        <Show when={props.hasInsuranceProviders}>
          <FieldRow label={t('label.insurance-status')}>
            <Text variant="body">
              {(props.patientPolicyCount ?? 0) > 0
                ? t('label.insured')
                : t('label.not-insured')}
            </Text>
          </FieldRow>
        </Show>
        <FieldRow label={t('heading.diagnosis')}>
          <Combobox<Diagnosis>
            label={t('heading.diagnosis')}
            hideLabel
            items={gated(diagnoses) ?? []}
            loading={diagnoses.loading}
            itemToString={d => d.description}
            itemToValue={d => d.id}
            value={props.node.diagnosisId ?? undefined}
            disabled={props.disabled}
            clearable
            onChange={diagnosis =>
              props.onSave({ diagnosisId: { value: diagnosis?.id ?? null } })
            }
          />
        </FieldRow>
      </SidePanelSection>

      {/* The source request — reachable from the dispensation it generated
          (spec/prescriptions/ui-surface.md S3 § side panel). The mirror of the
          request side's own Related documents section; the section only exists
          for a dispensation that came from a hand-over. */}
      <Show when={sourceRequestNode()}>
        {request => (
          <SidePanelSection
            value="related-documents"
            title={t('heading.related-documents')}
            collapsible
          >
            <FieldRow label={t('label.prescription-request')}>
              <Button
                variant="ghost"
                data-testid="source-prescription-request-link"
                onClick={() =>
                  navigate(
                    `/${props.storeId}/dispensary/prescription-request/${request().id}`
                  )
                }
              >
                {`#${request().prescriptionRequestNumber}`}
              </Button>
            </FieldRow>
          </SidePanelSection>
        )}
      </Show>

      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          {/* Delete — hidden once no longer deletable (permanently dead
              affordances are hidden, D39); danger tone (Delete buttons are
              danger app-wide, Carl 2026-07-24). */}
          <Show when={canDeletePrescription(status())}>
            <Button
              variant="danger"
              icon={<TrashIcon />}
              data-testid="delete-prescription-button"
              loading={deleting()}
              onClick={() => setDeleteConfirm(true)}
            >
              {t('label.delete')}
            </Button>
          </Show>
          {/* Cancel — VERIFIED only, never on a cancellation reversal; the
              permission gate withholds with its explanation through the
              affordance (AC-X4). Danger tone: voiding a verified prescription
              is destructive. */}
          <Show
            when={canCancelPrescription(status(), props.node.isCancellation)}
          >
            <Button
              variant="danger"
              icon={<MinusCircleIcon />}
              data-testid="cancel-prescription-button"
              title={
                props.canCancelPermission
                  ? undefined
                  : t('messages.cancel-prescription-not-allowed')
              }
              disabled={!props.canCancelPermission}
              onClick={() => setCancelConfirm(true)}
            >
              {t('label.cancel-prescription')}
            </Button>
          </Show>
          {/* Copy to clipboard — the shared control (controls § copy to
              clipboard). No extra fetch: the detail node this panel renders is
              already the whole prescription, its lines connector unpaginated. */}
          <CopyToClipboardButton load={() => props.node} />
        </SidePanelActions>
      </SidePanelSection>

      <ConfirmDialog
        open={deleteConfirm()}
        onClose={() => setDeleteConfirm(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-delete-prescription', {
          number: `${props.node.invoiceNumber}`,
        })}
        confirmVariant="danger"
        onConfirm={() => void runDelete()}
      />
      <ConfirmDialog
        open={cancelConfirm()}
        onClose={() => setCancelConfirm(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-cancel-prescription')}
        confirmVariant="danger"
        onConfirm={props.onCancel}
      />
    </>
  );
};
