import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../../../ui/elements/feedback/ConfirmDialog';
import { TrashIcon } from '../../../../ui/icons';
import type { SupplierReturnLineFragment } from '../supplierReturnDetail.generated';
import { saveReturnLines } from '../returnUpdate';

export interface DeleteLinesActionProps {
  storeId: string;
  returnId: string;
  /** The selected line rows. */
  selectedLines: () => SupplierReturnLineFragment[];
  /**
   * The delete landed — the view refetches the line table's current page and
   * clears the selection (the table is server-paginated, so the mutation's own
   * line set is never spliced in; spec rules § server-paginated line table).
   */
  onDeleted: () => void;
}

// Bulk line delete from the detail's line table (ui-surface S3 § footer — the
// bulk-action bar).
//
// There is NO line-delete mutation for supplier returns (contract § line rules:
// updateSupplierReturnLines is the one line call), so a delete is the same
// upsert every other line save uses, with the selected lines at quantity zero —
// which is exactly what the rules define zero to mean ("an existing line saved
// with quantity 0 is deleted"). The S4 modal reaches the same rule one item at a
// time; this is the whole selection in one call.
//
// `stockLineId` is required by the input and echoed back unchanged: the upsert
// keys off id + quantity, and zero decides the outcome. A line with no stock
// line cannot be expressed in the input at all, so it is dropped from the batch
// rather than sent as a broken row — supplier-return lines always carry one
// (they are raised FROM stock), so this is a type-level guard, not a live case.
export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [confirmOpen, setConfirmOpen] = createSignal(false);

  const run = async () => {
    const lines = props.selectedLines().flatMap(line =>
      line.stockLine
        ? [
            {
              id: line.id,
              stockLineId: line.stockLine.id,
              numberOfPacksToReturn: 0,
            },
          ]
        : []
    );
    if (lines.length === 0) return props.onDeleted();
    const result = await saveReturnLines(props.storeId, {
      supplierReturnId: props.returnId,
      supplierReturnLines: lines,
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
