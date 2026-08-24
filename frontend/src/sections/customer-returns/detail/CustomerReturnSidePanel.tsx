import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { RecordLink } from '../../../ui/elements/typography/RecordLink';
import { t, tPlural } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import {
  SidePanelSection,
  SidePanelActions,
} from '../../../ui/layout/SidePanel/SidePanel';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { UserLabel } from '../../../ui/elements/typography/UserLabel';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { Text } from '../../../ui/elements/typography/Text';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { Button } from '../../../ui/elements/buttons/Button';
import { OkButton } from '../../../ui/elements/buttons/StandardButtons';
import { CopyToClipboardButton } from '../../../ui/elements/buttons/CopyToClipboardButton';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { InfoIcon, TrashIcon } from '../../../ui/icons';
import { graphqlFetch } from '../../../api/graphql';
import {
  CustomerReturnForCopy,
  type CustomerReturnInfoFragment,
} from './customerReturnDetail.generated';
import { deleteReturn } from './returnUpdate';
import { hasIntroducedStock, returnKind } from './returnStatus';
import type { ReturnFieldEdit } from './returnEdit';

// The detail side panel (spec/customer-returns/ui-surface.md S3 § side panel):
// Additional info (edited-by / colour / comment) and Related documents (the
// originating outbound shipment, when there is one) are collapsible info
// sections (open by default); the record actions — Delete (offered only while
// NEW — rules § deletion, OMS-REG-DIST-07.42) and Copy to clipboard — are
// pinned at the panel's end, below them.

export interface CustomerReturnSidePanelProps {
  node: CustomerReturnInfoFragment;
  disabled: boolean;
  /**
   * Whether the return holds any lines — only lines carry stock, so this and
   * the status together decide the delete confirmation's stock warning.
   */
  hasLines: boolean;
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

  // Delete is offered at every status the return is editable at — the server's
  // own rule ("until VERIFIED") rather than a client copy of it, matching the
  // list's bulk delete so one return gives one answer wherever it is deleted
  // (validation.md § actions; issue #1134).
  //
  // The read-only gate stays: a transfer return at NEW is still in the sender's
  // hands (isReturnDisabled), which IS a standing property of the record, not
  // an admissibility question for the server.
  const canDelete = () => !props.disabled;

  // Whether deleting reverses a receipt, which the confirmation warns about
  // (rules § deletion rules). Both halves have to hold for there to be stock at
  // all: the return must have reached RECEIVED (hasIntroducedStock — a transfer
  // return at PICKED or SHIPPED holds none), and it must actually have lines,
  // since stock only ever comes from those.
  const removesStock = () =>
    hasIntroducedStock(props.node.status) && props.hasLines;

  const runDelete = async () => {
    const result = await deleteReturn(params.storeId, props.node.id);
    if (result.kind === 'deleted') {
      navigate(`/${params.storeId}/distribution/customer-return`);
      return;
    }
    // 'forbidden' has already raised the global permission-denied modal (D38);
    // every other refusal — a return finalised under this screen, or one of its
    // lines holding stock that has since been issued — gets the server's own
    // reason in a local notice.
    if (result.kind === 'error') setDeleteError(result.message);
    else if (result.kind === 'failed')
      setDeleteError(t('messages.cant-delete-generic'));
  };

  // The WHOLE return — header, every line, and the linked records — for the
  // copy action (controls § copy to clipboard). Its OWN operation, not the
  // screen's: customerReturnDetail is header-only and the line table holds one
  // server-paginated page, and the standard requires copy to make an
  // unpaginated read rather than serialise the page on screen. The nested
  // `lines` connector takes no page argument, so it carries the complete set. A
  // fetch failure routes to the global error modal; a NodeError (not expected
  // from a screen showing the record) copies nothing.
  const loadFullReturn = async () => {
    const result = await graphqlFetch(CustomerReturnForCopy, {
      storeId: params.storeId,
      id: props.node.id,
    });
    if (result.kind !== 'success') return undefined;
    if (result.data.invoice.__typename !== 'InvoiceNode') return undefined;
    // The node itself — the record, not the query wrapper ({"invoice": …}).
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
          <UserLabel
            username={props.node.user?.username}
            email={props.node.user?.email}
            label={t('label.edited-by')}
            testId="edited-by-field"
          />
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
          {/* Multi-line, in-place (ui-surface S3 § side panel) — the multi-line
              input role, not a single-line field. */}
          <TextArea
            label={t('heading.comment')}
            hideLabel
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
            // The current app's arrangement: the dated, attributed description
            // inline-start, the #N link pinned inline-end.
            <HStack gap="md" justify="between">
              <Text variant="body">
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
              <RecordLink
                testId="originating-shipment-link"
                href={`/${params.storeId}/distribution/outbound-shipment/${shipment().id}`}
              >
                #{shipment().invoiceNumber}
              </RecordLink>
            </HStack>
          )}
        </Show>
      </SidePanelSection>

      {/* Transport details — transfer returns only (ui-surface S3 § side panel),
          read-only: the transport reference is written by the transfer-creation
          process and no return surface edits it. Same section as the shipment
          verticals'; a return carries no shipping method or expected-delivery
          date, so the reference is the whole section. */}
      <Show when={returnKind(props.node) === 'transfer'}>
        <SidePanelSection
          value="transport-details"
          title={t('heading.transport-details')}
          collapsible
        >
          <FieldRow label={t('label.transport-reference')}>
            <span>{props.node.transportReference ?? '—'}</span>
          </FieldRow>
        </SidePanelSection>
      </Show>

      {/* Record-level actions (ui-surface S3): Delete (offered on any editable
          return, danger tone — Delete buttons are danger app-wide, Carl
          2026-07-24) and Copy to clipboard (secondary) — the shared
          SidePanelActions layout, matching the stocktake detail. */}
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
          {/* Copy to clipboard — the shared control (controls § copy to
              clipboard): it owns the JSON serialisation and the in-place
              copied/failed feedback; this panel only supplies the record. */}
          <CopyToClipboardButton load={loadFullReturn} />
        </SidePanelActions>
      </SidePanelSection>

      {/* Mounted only while open (kdd/action-modal) — see the status footer's
          hold confirm: a closed dialog keeps its `confirmation-modal` + footer
          ids matchable. */}
      <Show when={deleteConfirm()}>
        <ConfirmDialog
          open
          onClose={() => setDeleteConfirm(false)}
          title={t('heading.are-you-sure')}
          message={
            <>
              {tPlural('messages.confirm-delete-returns', 1)}
              {/* Receipt reversal — informational, so the confirm still
                  submits (validation.md § actions). */}
              <Show when={removesStock()}>
                <Alert severity="warning" testId="delete-removes-stock">
                  {t('messages.delete-removes-received-stock')}
                </Alert>
              </Show>
            </>
          }
          confirmVariant="danger"
          onConfirm={() => void runDelete()}
        />
      </Show>

      {/* An unexpected delete rejection (not a permission block, which routes to
          the global modal) — surfaced here rather than swallowed. */}
      <Show when={deleteError()}>
        <Dialog
          open
          onClose={() => setDeleteError(undefined)}
          icon={<InfoIcon />}
          // A refusal is not a fault (kdd/action-modal).
          title={t('heading.cannot-do-that')}
          description={deleteError()}
          // The standard, icon-less acknowledgement (D55).
          actions={
            <OkButton
              data-testid="dialog-button-ok"
              onClick={() => setDeleteError(undefined)}
            />
          }
        />
      </Show>
    </>
  );
};
