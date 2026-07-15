import React from 'react';
import {
  MaterialTable,
  ModalMode,
  NothingHere,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { CustomerReturnLineFragment, useReturns } from '../../api';
import { useCustomerReturnColumns } from '../columns';
import { Footer } from '../Footer';
import { CustomerReturnEditModal } from '../../modals';

export interface DetailsTabLineEdit {
  isOpen: boolean;
  mode: ModalMode | null;
  entity: string | null;
  onOpen: (entity?: string | null) => void;
  onClose: () => void;
}

interface DetailsTabProps {
  /**
   * Line-edit modal state lives in `DetailView` so the `AppBarButtons` "Add
   * Item" control (rendered outside this tab) can also open it. The modal
   * itself is rendered here so it stays scoped to the tab that owns the lines
   * table — see the matching pattern in InboundShipment.
   */
  lineEdit: DetailsTabLineEdit;
}

export const DetailsTab = ({ lineEdit }: DetailsTabProps) => {
  const t = useTranslation();
  const { data, isLoading } = useReturns.document.customerReturn();
  const { lines } = useReturns.lines.customerReturnRows();
  const isDisabled = useReturns.utils.customerIsDisabled();
  const columns = useCustomerReturnColumns();

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<CustomerReturnLineFragment>({
      tableId: 'purchase-order-detail-view',
      onRowClick: row => lineEdit.onOpen(row.itemId),
      columns,
      isLoading,
      data: lines,
      grouping: { field: 'itemCode' },
      enableRowSelection: !isDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-customer-return-items')}
          onCreate={isDisabled ? undefined : () => lineEdit.onOpen()}
          buttonText={t('button.add-item')}
        />
      ),
    });

  // Navigate items in the order they're currently displayed in the table
  // (respecting the user's sort), so "OK & Next" matches what the user sees.
  const sortedItemIds = table
    .getSortedRowModel()
    .rows.reduce<string[]>((acc, row) => {
      const leafRows = row.getLeafRows();
      const rows = leafRows.length ? leafRows : [row];
      rows.forEach(leaf => {
        const itemId = leaf.original?.itemId;
        if (itemId && !acc.includes(itemId)) acc.push(itemId);
      });
      return acc;
    }, []);
  const currentItemIndex = sortedItemIds.findIndex(
    id => id === lineEdit.entity
  );
  const nextItemId =
    currentItemIndex === -1 ? undefined : sortedItemIds[currentItemIndex + 1];

  if (!data) return null;

  return (
    <>
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      {lineEdit.isOpen && (
        <CustomerReturnEditModal
          isOpen={lineEdit.isOpen}
          onClose={lineEdit.onClose}
          outboundShipmentLineIds={[]}
          customerId={data.otherPartyId}
          returnId={data.id}
          initialItemId={lineEdit.entity}
          modalMode={lineEdit.mode}
          loadNextItem={() => {
            if (nextItemId) lineEdit.onOpen(nextItemId);
            else {
              // Closing and re-opening forces the modal to launch with the
              // item selector in focus
              lineEdit.onClose();
              setTimeout(() => lineEdit.onOpen(), 50);
            }
          }}
          hasNextItem={!!nextItemId}
        />
      )}
    </>
  );
};
