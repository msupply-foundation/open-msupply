import React, { useCallback } from 'react';
import {
  InvoiceLineNodeType,
  MaterialTable,
  ModalMode,
  NothingHere,
  useEditModal,
  useNonPaginatedMaterialTable,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { toItemRow, ItemRowFragment } from '@openmsupply-client/system';
import { StockOutItem } from '../../../types';
import { StockOutLineFragment } from '../../../StockOut';
import { CustomerReturnEditModal } from '../../../Returns';
import { canReturnOutboundLines } from '../../../utils';
import { useOutbound, useOutboundLines } from '../../api';
import { useOutboundColumns } from '../columns';
import { Footer } from '../Footer';
import { OutboundLineEdit, OutboundOpenedWith } from '../OutboundLineEdit';

export interface DetailsTabLineEdit {
  isOpen: boolean;
  mode: ModalMode | null;
  entity: OutboundOpenedWith;
  onOpen: (entity?: OutboundOpenedWith) => void;
  onClose: () => void;
  setMode: (mode: ModalMode) => void;
}

interface DetailsTabProps {
  /**
   * Line-edit modal state lives in `DetailView` so the `AppBarButtons` "Add
   * Item" control (rendered outside this tab) can also open it. The modal
   * itself is rendered here so it can read table-derived data (sort order)
   * without leaking the table into the parent.
   */
  lineEdit: DetailsTabLineEdit;
}

export const DetailsTab = ({ lineEdit }: DetailsTabProps) => {
  const t = useTranslation();
  const { info } = useNotification();
  const isDisabled = useOutbound.utils.isDisabled();

  const { data } = useOutbound.document.get();
  const { data: rows, isError } = useOutboundLines();

  const {
    onOpen: onOpenReturns,
    onClose: onCloseReturns,
    isOpen: returnsIsOpen,
    entity: outboundShipmentLineIds,
    mode: returnModalMode,
    setMode: setReturnMode,
  } = useEditModal<string[]>();

  const onRowClick = useCallback(
    (line: StockOutLineFragment | StockOutItem) => {
      lineEdit.onOpen({ itemId: toItemRow(line).id });
    },
    [lineEdit]
  );

  const onAddItem = useCallback(() => {
    lineEdit.onOpen();
    lineEdit.setMode(ModalMode.Create);
  }, [lineEdit]);

  const columns = useOutboundColumns();

  const isPlaceholderRow = (row: StockOutLineFragment) =>
    row.type === InvoiceLineNodeType.UnallocatedStock ||
    row.numberOfPacks === 0;

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<StockOutLineFragment>({
      tableId: 'outbound-shipment-detail-view',
      columns,
      data: rows,
      isError,
      grouping: { field: 'item.code' },
      isLoading: false,
      initialSort: { key: 'itemName', dir: 'asc' },
      onRowClick: !isDisabled ? onRowClick : undefined,
      getIsPlaceholderRow: row =>
        isPlaceholderRow(row.original) ||
        // Also mark parent rows as placeholder if any of its children are placeholders
        row.getLeafRows().some(leaf => isPlaceholderRow(leaf.original)),
      noDataElement: (
        <NothingHere
          body={t('error.no-outbound-items')}
          onCreate={isDisabled ? undefined : onAddItem}
          buttonText={t('button.add-item')}
        />
      ),
    });

  // Table manages the sorting state
  // This needs to be passed to the edit modal, so based on latest sort order
  // it can determine which item to load when user clicks `next`
  const getSortedItems = useCallback(
    () =>
      table.getSortedRowModel().rows.reduce<ItemRowFragment[]>((acc, row) => {
        const item = row.original.item;
        if (!acc.find(i => i.id === item.id)) acc.push(item);
        return acc;
      }, []),
    [table]
  );

  const onReturn = useCallback(async () => {
    if (!data || !canReturnOutboundLines(data)) {
      const cantReturnSnack = info(t('messages.cant-return-shipment'));
      cantReturnSnack();
    } else if (!selectedRows.length) {
      const selectLinesSnack = info(t('messages.select-rows-to-return'));
      selectLinesSnack();
    } else {
      const selectedIds = selectedRows.map(line => line?.id ?? '');

      onOpenReturns(selectedIds);
      setReturnMode(ModalMode.Create);
    }
  }, [data, selectedRows, info, onOpenReturns, setReturnMode, t]);

  if (!data) return null;

  return (
    <>
      <MaterialTable table={table} />
      <Footer
        onReturnLines={onReturn}
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      {lineEdit.isOpen && (
        <OutboundLineEdit
          openedWith={lineEdit.entity}
          mode={lineEdit.mode}
          isOpen={lineEdit.isOpen}
          onClose={lineEdit.onClose}
          status={data.status}
          invoiceId={data.id}
          getSortedItems={getSortedItems}
        />
      )}
      {returnsIsOpen && (
        <CustomerReturnEditModal
          isOpen={returnsIsOpen}
          onClose={onCloseReturns}
          outboundShipmentLineIds={outboundShipmentLineIds || []}
          customerId={data.otherPartyId}
          modalMode={returnModalMode}
          outboundShipment={data}
          onCreate={table.resetRowSelection}
          isNewReturn
        />
      )}
    </>
  );
};
