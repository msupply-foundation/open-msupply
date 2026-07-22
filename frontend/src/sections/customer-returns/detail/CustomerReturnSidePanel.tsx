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
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { CheckIcon, CopyIcon, InfoIcon, TrashIcon } from '../../../ui/icons';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';
import { deleteReturn } from './returnUpdate';
import type { ReturnFieldEdit } from './returnEdit';

// The detail side panel (spec/customer-returns/ui-surface.md S3 § side panel):
// Additional info (edited-by / colour / comment) and Related documents (the
// originating outbound shipment, when there is one) are collapsible info
// sections (open by default); the record actions — Delete (offered only while
// NEW — rules § deletion, AC-D3) and Copy to clipboard — are pinned at the
// panel's end, below them.

export interface CustomerReturnSidePanelProps {
  node: CustomerReturnInfoFragment;
  disabled: boolean;
  /** The shared return edit buffer — this panel reads/writes comment. */
  edit: ReturnFieldEdit;
  /** Colour save (header-level, in place). */
  onSetColour: (colour: string) => void;
}

export const CustomerReturnSidePanel: Component<
  CustomerReturnSidePanelProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal<string>();

  // Delete is offered only while NEW (AC-D3 — the UI's conservative gate; the
  // server's own rule is "until VERIFIED", asserted separately by AC-D1/D2),
  // and never on a read-only return — a transfer return at NEW is still in the
  // sender's hands (isReturnDisabled), so it must share the standing gate every
  // other affordance respects rather than keying off status alone.
  const canDelete = () => !props.disabled && props.node.status === 'NEW';

  const runDelete = async () => {
    const result = await deleteReturn(params.storeId, props.node.id);
    if (result.kind === 'deleted') {
      navigate(`/${params.storeId}/distribution/customer-return`);
      return;
    }
    // A rejection here is unexpected (the action is gated to NEW). 'forbidden'
    // has already raised the global permission-denied modal (D38); the other
    // cases (e.g. a concurrent advance to VERIFIED) get a local notice instead
    // of failing silently.
    if (result.kind === 'error') setDeleteError(result.message);
    else if (result.kind === 'failed')
      setDeleteError(t('messages.cant-delete-generic'));
  };

  // Copy to clipboard: a readable text snapshot of the record (the current
  // app's "copy record" affordance).
  const copy = async () => {
    const n = props.node;
    const text = [
      `${t('customer-returns')} #${n.invoiceNumber}`,
      `${t('label.name')}: ${n.otherPartyName}`,
      `${t('label.status')}: ${n.status}`,
      `${t('label.created')}: ${localisedDate(n.createdDatetime)}`,
      `${t('label.reference')}: ${n.theirReference ?? ''}`,
      `${t('label.comment')}: ${n.comment ?? ''}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
  };

  return (
    <>
      <SidePanelSection title={t('heading.additional-info')} collapsible>
        <FieldRow label={t('label.edited-by')}>
          <Text variant="body">{props.node.user?.username ?? '—'}</Text>
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

      {/* Related documents (rules § creation — the originating-shipment link is
          permanent; contract § manual vs transfer): a dated, attributed link to
          the outbound shipment a manual return was created from. */}
      <SidePanelSection title={t('heading.related-documents')} collapsible>
        <Show
          when={props.node.originalShipment}
          fallback={
            <Text variant="body">{t('messages.no-related-documents')}</Text>
          }
        >
          {shipment => (
            <Text variant="body">
              <A
                href={`/${params.storeId}/distribution/outbound-shipment/${shipment().id}`}
              >
                #{shipment().invoiceNumber}
              </A>{' '}
              {t('messages.outbound-shipment-created-on', {
                date: localisedDate(shipment().createdDatetime),
              })}
              <Show when={shipment().user?.username}>
                {' '}
                {t('messages.by-user', {
                  username: shipment().user?.username ?? '',
                })}
              </Show>
            </Text>
          )}
        </Show>
      </SidePanelSection>

      {/* Record-level actions (ui-surface S3): Delete (gated to an editable NEW
          return) and Copy to clipboard — the shared SidePanelActions layout and
          secondary-button tone, matching the stocktake detail. */}
      <SidePanelSection title={t('heading.actions')}>
        <SidePanelActions>
          <Button
            variant="secondary"
            icon={<TrashIcon />}
            data-testid="delete-return-button"
            disabled={!canDelete()}
            onClick={() => setDeleteConfirm(true)}
          >
            {t('button.delete')}
          </Button>
          <Button
            variant="secondary"
            icon={<CopyIcon />}
            onClick={() => void copy()}
          >
            {t('link.copy-to-clipboard')}
          </Button>
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
