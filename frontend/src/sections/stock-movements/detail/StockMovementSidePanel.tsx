import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t, tPlural } from '@/intl';
import { localisedDate } from '@/intl/formatDateTime';
import {
  SidePanelSection,
  SidePanelActions,
} from '@/ui/layout/SidePanel/SidePanel';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { UserLabel } from '@/ui/elements/typography/UserLabel';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { Button } from '@/ui/elements/buttons/Button';
import { OkButton } from '@/ui/elements/buttons/StandardButtons';
import { CopyToClipboardButton } from '@/ui/elements/buttons/CopyToClipboardButton';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { InfoIcon, TrashIcon } from '@/ui/icons';
import { deleteMovement } from './stockMovementUpdate';
import type {
  StockMovementDetailResult,
  StockMovementInfoFragment,
} from './stockMovementDetail.generated';
import type { MovementFieldEdit } from './stockMovementEdit';

// The detail side panel (spec/stock-movements/ui-surface.md S2 § side panel;
// src/ui/docs/SIDE_PANEL.md): one Additional-info section — Number, Entered
// by, Created, then Confirmed / Finalised rows appearing only once their
// datetime is set, and the Comment (multi-line, saving as the user types,
// disabled when finalised) — plus the pinned Actions section: Delete
// (disabled when finalised — rules § deletion) and Copy to clipboard (the
// shared control's in-place feedback, D21).

export interface StockMovementSidePanelProps {
  node: StockMovementInfoFragment;
  /** FINALISED — every edit affordance disables (rules § editability). */
  disabled: boolean;
  /** The shared edit buffer — this panel reads/writes comment. */
  edit: MovementFieldEdit;
  /**
   * The full document as fetched (header + every line) — the copy action's
   * source; the detail read already carries the whole record.
   */
  fullDocument: () =>
    | Extract<
        StockMovementDetailResult['stockRelocation'],
        { __typename: 'StockRelocationNode' }
      >
    | undefined;
}

export const StockMovementSidePanel: Component<
  StockMovementSidePanelProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal<string>();

  const runDelete = async () => {
    const result = await deleteMovement(params.storeId, props.node.id);
    if (result.kind === 'deleted') {
      // replace: true — Back must not return to a now-missing record.
      navigate(`/${params.storeId}/inventory/stock-movement`, {
        replace: true,
      });
      return;
    }
    if (result.kind === 'error') setDeleteError(result.message);
    else if (result.kind === 'failed')
      setDeleteError(t('messages.cant-delete-generic'));
  };

  return (
    <>
      <SidePanelSection
        value="additional-info"
        title={t('heading.additional-info')}
        collapsible
      >
        <FieldRow label={t('label.number')}>
          <span data-testid="number-field">
            {props.node.stockMovementNumber}
          </span>
        </FieldRow>
        <FieldRow label={t('label.entered-by')}>
          <UserLabel
            username={props.node.user?.username}
            email={props.node.user?.email}
            label={t('label.entered-by')}
            testId="entered-by-field"
          />
        </FieldRow>
        <FieldRow label={t('label.created')}>
          <span>{localisedDate(props.node.createdDatetime)}</span>
        </FieldRow>
        {/* Confirmed / Finalised appear only once reached (ui-surface S2). */}
        <Show when={props.node.confirmedDatetime}>
          {date => (
            <FieldRow label={t('label.confirmed')}>
              <span>{localisedDate(date())}</span>
            </FieldRow>
          )}
        </Show>
        <Show when={props.node.finalisedDatetime}>
          {date => (
            <FieldRow label={t('label.finalised')}>
              <span>{localisedDate(date())}</span>
            </FieldRow>
          )}
        </Show>
        <FieldRow label={t('heading.comment')}>
          <TextArea
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

      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          <Button
            variant="danger"
            icon={<TrashIcon />}
            data-testid="delete-stock-movement-button"
            disabled={props.disabled}
            onClick={() => setDeleteConfirm(true)}
          >
            {t('button.delete')}
          </Button>
          {/* The whole document is already on screen (lines load with it —
              ui-surface S2 § line table), so copy reads the fetched record;
              no second query. */}
          <CopyToClipboardButton load={() => props.fullDocument()} />
        </SidePanelActions>
      </SidePanelSection>

      {/* Mounted only while open (kdd/action-modal). */}
      <Show when={deleteConfirm()}>
        <ConfirmDialog
          open
          onClose={() => setDeleteConfirm(false)}
          title={t('heading.are-you-sure')}
          message={tPlural('messages.confirm-delete-stock-movements', 1)}
          confirmVariant="danger"
          onConfirm={() => void runDelete()}
        />
      </Show>

      {/* An unexpected delete rejection (a concurrent finalise, say) —
          surfaced rather than swallowed. */}
      <Show when={deleteError()}>
        <Dialog
          open
          onClose={() => setDeleteError(undefined)}
          icon={<InfoIcon />}
          title={t('error.something-wrong')}
          description={deleteError()}
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
