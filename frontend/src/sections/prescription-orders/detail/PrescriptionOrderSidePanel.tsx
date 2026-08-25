import { createResource, createSignal, For, Show, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import {
  SidePanelSection,
  SidePanelActions,
} from '../../../ui/layout/SidePanel/SidePanel';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { UserLabel } from '../../../ui/elements/typography/UserLabel';
import { Text } from '../../../ui/elements/typography/Text';
import { Button } from '../../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import { TrashIcon } from '../../../ui/icons';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { asOrderStatus, isEditable } from '../prescriptionOrderStatus';
import {
  DeletePrescriptionOrderById,
  GeneratedDispensations,
  type PrescriptionOrderFieldsFragment,
} from './prescriptionOrderDetail.generated';
import type { DebouncedEdit } from '../../../domain/debouncedEdit';

// The detail side panel (spec/prescription-orders/ui-surface.md S3 § side
// panel): Additional info (Entered by / Created / Comment) · Patient details
// (live from the patient record — rules § patient data is live) · Related
// documents (the generated dispensation, linked, once Ready to dispense —
// AC-R4) — then the pinned record actions: Delete (while New, AC-D1/D2) and
// Copy to clipboard.

export interface PrescriptionOrderEditFields {
  comment: string;
}

export interface PrescriptionOrderSidePanelProps {
  storeId: string;
  node: PrescriptionOrderFieldsFragment;
  disabled: boolean;
  /** The shared debounced edit buffer (comment). */
  edit: DebouncedEdit<PrescriptionOrderEditFields>;
  onDeleted: () => void;
}

export const PrescriptionOrderSidePanel: Component<
  PrescriptionOrderSidePanelProps
> = props => {
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  const status = () => asOrderStatus(props.node.status);

  // The generated dispensation(s) — the back-link lookup (contract § the
  // hand-over), keyed on the order + its status so the hand-over refetches.
  // Read non-suspending: the panel lives under the already-open detail.
  const [dispensations] = createResource(
    () =>
      isEditable(status())
        ? undefined
        : { id: props.node.id, status: status() },
    async ({ id }) => {
      const result = await graphqlFetch(GeneratedDispensations, {
        storeId: props.storeId,
        prescriptionOrderId: { equalTo: id },
      });
      return result.kind === 'success' ? result.data.invoices.nodes : undefined;
    }
  );
  const relatedDispensations = () => gated(dispensations) ?? [];

  const runDelete = async () => {
    setDeleting(true);
    const result = await graphqlFetch(DeletePrescriptionOrderById, {
      storeId: props.storeId,
      id: props.node.id,
    });
    setDeleting(false);
    if (result.kind !== 'success') return;
    props.onDeleted();
  };

  return (
    <>
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
      </SidePanelSection>

      {/* The generated dispensation — reachable from the order (AC-R4); the
          section only exists once a hand-over can have produced one. */}
      <Show when={!isEditable(status())}>
        <SidePanelSection
          value="related-documents"
          title={t('heading.related-documents')}
          collapsible
        >
          <For each={relatedDispensations()}>
            {dispensation => (
              <FieldRow label={t('label.dispensation')}>
                <Button
                  variant="ghost"
                  data-testid="related-dispensation-link"
                  onClick={() =>
                    navigate(
                      `/${props.storeId}/dispensary/prescription/${dispensation.id}`
                    )
                  }
                >
                  {`#${dispensation.invoiceNumber}`}
                </Button>
              </FieldRow>
            )}
          </For>
        </SidePanelSection>
      </Show>

      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          {/* Delete — hidden once no longer deletable (New only, AC-D2). */}
          <Show when={isEditable(status())}>
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
          <CopyToClipboardButton load={() => props.node} />
        </SidePanelActions>
      </SidePanelSection>

      <ConfirmDialog
        open={deleteConfirm()}
        onClose={() => setDeleteConfirm(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-delete-prescription', {
          number: `${props.node.prescriptionOrderNumber}`,
        })}
        confirmVariant="danger"
        onConfirm={() => void runDelete()}
      />
    </>
  );
};
