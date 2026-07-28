import { createSignal, Show, type Component } from 'solid-js';
import { A, useNavigate, useParams } from '@solidjs/router';
import { t, tPlural } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import {
  SidePanelSection,
  SidePanelActions,
} from '../../../ui/layout/SidePanel/SidePanel';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { Text } from '../../../ui/elements/typography/Text';
import { Button } from '../../../ui/elements/buttons/Button';
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Popover } from '../../../ui/elements/feedback/Popover';
import { CheckIcon, InfoIcon, TrashIcon } from '../../../ui/icons';
import { graphqlFetch } from '../../../api/graphql';
import {
  SupplierReturnDetail,
  type SupplierReturnInfoFragment,
} from './supplierReturnDetail.generated';
import { deleteReturn } from './returnUpdate';
import type { ReturnFieldEdit } from './returnEdit';

// The detail side panel (spec/supplier-returns/ui-surface.md S3 § side panel):
// Additional info (edited-by / colour / comment), Related documents (the
// originating inbound shipment, when there is one), and Transport details
// (reference) are collapsible info sections (open by default); the record
// actions — Delete (offered while editable — rules § deletion) and Copy to
// clipboard — are pinned at the panel's end, below them.

export interface SupplierReturnSidePanelProps {
  node: SupplierReturnInfoFragment;
  disabled: boolean;
  /** The shared return edit buffer — reads/writes comment + transportReference. */
  edit: ReturnFieldEdit;
  /** Colour save (header-level, in place). */
  onSetColour: (colour: string) => void;
}

export const SupplierReturnSidePanel: Component<
  SupplierReturnSidePanelProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal<string>();

  // Delete is offered while the return is editable (NEW or PICKED — the UI
  // offers it regardless of which; rules § deletion). A SHIPPED return is
  // read-only (isReturnDisabled), so it shares the standing gate.
  const canDelete = () => !props.disabled;

  const runDelete = async () => {
    const result = await deleteReturn(params.storeId, props.node.id);
    if (result.kind === 'deleted') {
      navigate(`/${params.storeId}/replenishment/supplier-return`);
      return;
    }
    // 'forbidden' has already raised the global permission-denied modal (D38);
    // the other cases (e.g. a concurrent advance to SHIPPED) get a local notice
    // instead of failing silently.
    if (result.kind === 'error') setDeleteError(result.message);
    else if (result.kind === 'failed')
      setDeleteError(t('messages.cant-delete-generic'));
  };

  // The WHOLE return — header, every line, and the linked records — for the
  // copy action (controls § copy to clipboard). This panel is handed the info
  // node alone, so copy re-reads the detail query, whose nested `lines`
  // connector carries the complete line set.
  const loadFullReturn = async () => {
    const result = await graphqlFetch(SupplierReturnDetail, {
      storeId: params.storeId,
      id: props.node.id,
    });
    if (result.kind !== 'success') return undefined;
    if (result.data.invoice.__typename !== 'InvoiceNode') return undefined;
    return result.data.invoice;
  };

  return (
    <>
      <SidePanelSection
        value="additional-info"
        title={t('heading.additional-info')}
        collapsible
      >
        <FieldRow label={t('label.edited-by')}>
          <span
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Text variant="body" as="span">
              {props.node.user?.username ?? '—'}
            </Text>
            <Show when={props.node.user?.email}>
              {email => (
                <Popover
                  trigger={<InfoIcon />}
                  triggerLabel={email()}
                  openOnHover
                  placement="top"
                >
                  <p>{email()}</p>
                </Popover>
              )}
            </Show>
          </span>
        </FieldRow>
        <FieldRow label={t('label.color')}>
          <Show
            when={!props.disabled}
            fallback={<ColourTagDot colour={props.node.colour ?? null} />}
          >
            <ColourTagPicker
              colour={props.node.colour ?? null}
              variant="field"
              onSelect={props.onSetColour}
            />
          </Show>
        </FieldRow>
        <FieldRow label={t('heading.comment')}>
          <TextField
            label={t('heading.comment')}
            hideLabel
            width="full"
            data-testid="comment-field"
            value={props.edit.state.comment}
            disabled={props.disabled}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Related documents (rules § from an originating inbound shipment — the
          link is permanent): a dated, attributed link to the inbound shipment a
          from-shipment return was raised against. */}
      <SidePanelSection
        value="related-documents"
        title={t('heading.related-documents')}
        collapsible
      >
        <Show
          when={props.node.originalShipment}
          fallback={
            <Text variant="body">{t('messages.no-related-documents')}</Text>
          }
        >
          {shipment => (
            <span
              style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                gap: 'var(--space-3)',
              }}
            >
              <Text variant="body">
                {t('messages.inbound-shipment-created-on', {
                  date: localisedDate(shipment().createdDatetime),
                })}
                <Show when={shipment().user?.username}>
                  {' '}
                  {t('messages.by-user', {
                    username: shipment().user?.username ?? '',
                  })}
                </Show>
              </Text>
              <A
                href={`/${params.storeId}/replenishment/inbound-shipment/${shipment().id}`}
              >
                #{shipment().invoiceNumber}
              </A>
            </span>
          )}
        </Show>
      </SidePanelSection>

      {/* Transport details (ui-surface S3 § side panel): the transport
          reference, in-place, edited through the shared debounced buffer. */}
      <SidePanelSection
        value="transport-details"
        title={t('heading.transport-details')}
        collapsible
      >
        <FieldRow label={t('label.reference')}>
          <TextField
            label={t('label.reference')}
            hideLabel
            width="full"
            data-testid="transport-reference-field"
            value={props.edit.state.transportReference}
            disabled={props.disabled}
            onInput={e =>
              props.edit.setField('transportReference', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Record-level actions (ui-surface S3): Delete (gated to an editable
          return, danger tone) and Copy to clipboard (secondary). */}
      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          <Button
            variant="danger"
            icon={<TrashIcon />}
            data-testid="delete-return-button"
            disabled={!canDelete()}
            onClick={() => setDeleteConfirm(true)}
          >
            {t('button.delete')}
          </Button>
          <CopyToClipboardButton load={loadFullReturn} />
        </SidePanelActions>
      </SidePanelSection>

      <ConfirmDialog
        open={deleteConfirm()}
        onClose={() => setDeleteConfirm(false)}
        title={t('heading.are-you-sure')}
        message={tPlural('messages.confirm-delete-returns', 1)}
        onConfirm={() => void runDelete()}
      />

      {/* An unexpected delete rejection (not a permission block, which routes to
          the global modal) — surfaced here rather than swallowed. */}
      <Show when={deleteError()}>
        <Dialog
          open
          onClose={() => setDeleteError(undefined)}
          icon={<InfoIcon />}
          title={t('error.something-wrong')}
          description={deleteError()}
          actions={
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              onClick={() => setDeleteError(undefined)}
            >
              {t('button.ok')}
            </Button>
          }
        />
      </Show>
    </>
  );
};
