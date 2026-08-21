import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Button } from '../../../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../../../ui/elements/feedback/ConfirmDialog';
import { TrashIcon } from '../../../../ui/icons';
import { DeleteOutboundLines } from '../outboundDetail.generated';
import type { OutboundLineFragment } from '../outboundDetail.generated';

export interface DeleteLinesActionProps {
  storeId: string;
  /** The selected LINE rows (leaves — the view resolves group selections). */
  selectedLines: () => OutboundLineFragment[];
  disabled: boolean;
  /**
   * Something committed — the view refetches (stock released,
   * OMS-REG-SMV-03.13).
   */
  onCommitted: () => void;
}

// Bulk line delete (spec S3 § bulk line actions): stock, placeholder, and
// service lines each go through their own batch array in one call; the
// confirmation counts the lines. Deleting releases exactly what each line held
// (OMS-REG-SMV-03.13 — server-side; the view refetches to reflect it).
export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [confirmOpen, setConfirmOpen] = createSignal(false);

  const run = async () => {
    const lines = props.selectedLines();
    const byType = (type: OutboundLineFragment['type']) =>
      lines.filter(line => line.type === type).map(line => ({ id: line.id }));
    const result = await graphqlFetch(DeleteOutboundLines, {
      storeId: props.storeId,
      stockLines: byType('STOCK_OUT'),
      placeholders: byType('UNALLOCATED_STOCK'),
      serviceLines: byType('SERVICE'),
    });
    if (result.kind === 'success') props.onCommitted();
  };

  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        disabled={props.disabled}
        onClick={() => setConfirmOpen(true)}
      >
        {t('label.delete')}
      </Button>
      <Show when={confirmOpen()}>
        <ConfirmDialog
          open
          onClose={() => setConfirmOpen(false)}
          title={t('heading.are-you-sure')}
          message={tPlural(
            'messages.confirm-delete-shipment-lines',
            props.selectedLines().length
          )}
          confirmVariant="danger"
          onConfirm={() => void run()}
        />
      </Show>
    </>
  );
};
