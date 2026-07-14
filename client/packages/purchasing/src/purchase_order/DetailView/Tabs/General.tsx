import React, { useCallback } from 'react';
import {
  MaterialTable,
  ModalMode,
  NothingHere,
  PurchaseOrderLineStatusNode,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { canAddNewLines, isPurchaseOrderDisabled } from '../../../utils';
import { PurchaseOrderLineFragment, usePurchaseOrder } from '../../api';
import { Footer } from '../Footer';
import { PurchaseOrderLineEditModal } from '../LineEdit/PurchaseOrderLineEditModal';
import { usePurchaseOrderColumns } from '../columns';

const getPlaceholderRow = (line: PurchaseOrderLineFragment) => {
  return line.requestedNumberOfUnits === 0;
};

const getClosedLine = (line: PurchaseOrderLineFragment) => {
  return line.status === PurchaseOrderLineStatusNode.Closed;
};

export interface GeneralTabLineEdit {
  isOpen: boolean;
  mode: ModalMode | null;
  entity: string | null;
  onOpen: (entity?: string | null) => void;
  onClose: () => void;
}

interface GeneralTabProps {
  /**
   * Line-edit modal state lives in `DetailView` so the `AppBarButtons` "Add
   * Item" control (rendered outside this tab) can also open it. The modal
   * itself is rendered here so it stays scoped to the tab that owns the lines
   * table.
   */
  lineEdit: GeneralTabLineEdit;
}

export const GeneralTab = ({ lineEdit }: GeneralTabProps) => {
  const t = useTranslation();
  const {
    query: { data, isFetching },
    lines: { filteredLines: lines },
  } = usePurchaseOrder();

  const disableNewLines = !data || !canAddNewLines(data);
  const isDisabled = !data || isPurchaseOrderDisabled(data);
  const columns = usePurchaseOrderColumns(data?.currency?.code);

  const onRowClick = useCallback(
    (line: PurchaseOrderLineFragment) => {
      lineEdit.onOpen(line.id);
    },
    [lineEdit]
  );

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<PurchaseOrderLineFragment>({
      tableId: 'purchase-order-detail-view',
      isLoading: isFetching,
      onRowClick,
      columns,
      data: lines,
      initialSort: { key: 'lineNumber', dir: 'asc' },
      getIsRestrictedRow: row => getClosedLine(row.original),
      getIsPlaceholderRow: row => getPlaceholderRow(row.original),
      manualFiltering: true,
      noDataElement: (
        <NothingHere
          body={t('error.no-purchase-order-items')}
          onCreate={disableNewLines ? undefined : () => lineEdit.onOpen()}
        />
      ),
    });

  if (!data) return null;

  // Navigate lines in the order they're currently displayed in the table
  // (respecting the user's sort), so "OK & Next" matches what the user sees.
  const sortedLineIds = table
    .getSortedRowModel()
    .rows.map(row => row.original.id);
  const currentLineIndex = sortedLineIds.findIndex(
    id => id === lineEdit.entity
  );
  const hasNext =
    currentLineIndex !== -1 && currentLineIndex < sortedLineIds.length - 1;
  const openNext = () => {
    const nextId = sortedLineIds[currentLineIndex + 1];
    if (!nextId) return;
    lineEdit.onOpen(nextId);
  };

  return (
    <>
      <MaterialTable table={table} />
      <Footer
        status={data.status}
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      {lineEdit.isOpen && (
        <PurchaseOrderLineEditModal
          purchaseOrder={data}
          isOpen={lineEdit.isOpen}
          onClose={lineEdit.onClose}
          mode={lineEdit.mode}
          lineId={lineEdit.entity}
          isDisabled={isDisabled}
          hasNext={hasNext}
          openNext={openNext}
        />
      )}
    </>
  );
};
