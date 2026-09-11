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
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { CancelButton } from '../../../ui/elements/buttons/StandardButtons';
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import { MinusCircleIcon, TrashIcon } from '../../../ui/icons';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { hasPermission } from '../../../store/storeContext';
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
  const [cancelConfirm, setCancelConfirm] = createSignal(false);
  // The delete dialog's phase; undefined is closed. Phased rather than a
  // ConfirmDialog because a refusal has to be SHOWN: ConfirmDialog closes
  // itself on confirm, so the server's verdict had nowhere to land and a
  // refused delete was a silent no-op. Same three phases and the same wording
  // as the list's delete action, which already had this.
  const [deletePhase, setDeletePhase] = createSignal<
    'confirm' | 'deleting' | 'error'
  >();
  const [deleteError, setDeleteError] = createSignal(
    t('messages.cant-delete-generic')
  );

  const status = () => asPrescriptionStatus(props.node.status);

  // A dispensation GENERATED from a prescription request carries the
  // prescriber's Diagnosis, copied at the hand-over from a request that is
  // itself locked — so it is read-only here however editable the record is
  // (issue #513; the toolbar does the same for Patient and Clinician).
  const fromRequest = () => props.node.prescriptionRequestId != null;

  // The active diagnoses the Diagnosis picker offers (the picker is the only
  // guard — an unknown id fails opaquely, contract wire trap). Read
  // non-suspending: the panel lives under the already-open detail.
  const [diagnoses] = createResource(async () => {
    const result = await graphqlFetch(DiagnosesActive, {});
    return result.kind === 'success' ? result.data.diagnosesActive : undefined;
  });

  const runDelete = async () => {
    if (deletePhase() !== 'confirm') return; // re-entry guard
    setDeletePhase('deleting');
    const result = await graphqlFetch(DeletePrescription, {
      storeId: props.storeId,
      id: props.node.id,
    });
    if (result.kind !== 'success') {
      setDeletePhase('confirm');
      return;
    }
    const response = result.data.deletePrescription;
    if ('id' in response) {
      setDeletePhase(undefined);
      props.onDeleted();
      return;
    }
    // Reacting to the server's verdict, keyed to its cause (ui-standards §
    // validation, controls § action feedback). A dispensation generated from
    // a prescription request refuses at any status and nothing on this record
    // distinguishes it from a deletable one, so the generic line would leave
    // the user clicking Delete with no idea why nothing happens. Read
    // defensively: a union member neither fragment covers arrives as `{}`, and
    // that is a refusal we have nothing specific to say about, not a crash.
    setDeleteError(
      'error' in response &&
        response.error.__typename === 'CannotDeleteGeneratedDispensation'
        ? t('messages.cant-delete-generated-dispensation')
        : t('messages.cant-delete-generic')
    );
    setDeletePhase('error');
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
  //
  // GATED ON THE REQUEST VERTICAL'S OWN READ, which a dispenser need not hold
  // (spec/prescription-requests § permissions): the request read authorises on
  // it, so asking without it would answer Forbidden and raise the global
  // permission-denied modal over an unrelated screen — every time such a
  // dispensation is opened. Not asking is also the honest answer for the
  // section: a link that cannot open is not offered (D94).
  const [sourceRequest] = createResource(
    () =>
      hasPermission('PRESCRIPTION_REQUEST_QUERY')
        ? (props.node.prescriptionRequestId ?? undefined)
        : undefined,
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
            disabled={props.disabled || fromRequest()}
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
              loading={deletePhase() === 'deleting'}
              onClick={() => setDeletePhase('confirm')}
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

      <Show when={deletePhase()}>
        {phase => (
          <Dialog
            open
            dismissable={phase() !== 'deleting'}
            onClose={() => setDeletePhase(undefined)}
            icon={<TrashIcon />}
            testId="confirmation-modal"
            // The title tracks the phase — a rejection is not a question
            // (kdd/action-modal).
            title={
              phase() === 'error'
                ? t('heading.cannot-do-that')
                : t('heading.are-you-sure')
            }
            description={
              <Show
                when={phase() === 'error'}
                fallback={t('messages.confirm-delete-dispensing-record', {
                  number: `${props.node.invoiceNumber}`,
                })}
              >
                <Alert severity="error">{deleteError()}</Alert>
              </Show>
            }
            actions={
              <Show
                when={phase() === 'error'}
                fallback={
                  <>
                    <Show when={phase() === 'confirm'}>
                      <CancelButton onClick={() => setDeletePhase(undefined)} />
                    </Show>
                    <Button
                      variant="danger"
                      confirms="plain"
                      data-testid="confirmation-modal-ok"
                      loading={phase() === 'deleting'}
                      onClick={() => void runDelete()}
                    >
                      {t('button.ok')}
                    </Button>
                  </>
                }
              >
                <Button
                  variant="secondary"
                  confirms="plain"
                  onClick={() => setDeletePhase(undefined)}
                >
                  {t('button.close')}
                </Button>
              </Show>
            }
          />
        )}
      </Show>
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
