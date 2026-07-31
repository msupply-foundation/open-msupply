import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../../../ui/elements/feedback/ConfirmDialog';
import { TrashIcon } from '../../../../ui/icons';
import type { CustomerReturnLineFragment } from '../customerReturnDetail.generated';
import { saveReturnLines } from '../returnUpdate';

export interface DeleteLinesActionProps {
  storeId: string;
  returnId: string;
  /** The selected line rows (OMS-REG-DIST-07.8). */
  selectedLines: () => CustomerReturnLineFragment[];
  /**
   * The delete landed — the view refetches the line table's current page and
   * clears the selection (the table is server-paginated, so the mutation's own
   * line set is never spliced in; spec rules § server-paginated line table).
   */
  onDeleted: () => void;
}

// Bulk line delete from the detail's line table (ui-surface S3 § footer — the
// bulk-action bar; OMS-REG-DIST-07.8).
//
// There is NO line-delete mutation for customer returns (contract § line rules:
// updateCustomerReturnLines is the one line call), so a delete is the same
// upsert every other line save uses, with the selected lines at quantity zero —
// which is exactly what the rules define zero to mean ("an existing line saved
// with quantity 0 is deleted"). The S4 modal reaches the same rule one item at
// a time; this is the whole selection in one call.
//
// The line's other required input fields (itemId, packSize) are echoed back
// unchanged: the upsert keys off id + quantity, and zero decides the outcome.
export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [confirmOpen, setConfirmOpen] = createSignal(false);

  const run = async () => {
    const result = await saveReturnLines(props.storeId, {
      customerReturnId: props.returnId,
      customerReturnLines: props.selectedLines().map(line => ({
        id: line.id,
        itemId: line.item.id,
        packSize: line.packSize,
        numberOfPacksReturned: 0,
      })),
    });
    // A rejection is already showing — saveReturnLines routes Forbidden to the
    // global permission modal and anything else to the unexpected-error one.
    if (result.kind === 'saved') props.onDeleted();
  };

  return (
    <>
      {/* Destructive tone (ui-standards: delete = danger), matching the
          confirm below and the list's bulk delete. */}
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
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
            'messages.confirm-delete-invoice-lines',
            props.selectedLines().length
          )}
          confirmVariant="danger"
          onConfirm={() => void run()}
        />
      </Show>
    </>
  );
};
