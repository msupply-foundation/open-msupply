import React, { useCallback, useMemo, useState } from 'react';
import {
  CardList,
  MaterialTable,
  ModalMode,
  NothingHere,
  useEditModal,
  useIsExtraSmallScreen,
  useNonPaginatedMaterialTable,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  useIsItemVariantsEnabled,
  useVvmStatusesEnabled,
} from '@openmsupply-client/system';
import { Footer } from '../Footer';
import { InboundLineEdit } from '../modals/InboundLineEdit';
import { SupplierReturnEditModal } from '../../../Returns';
import { InboundLineFragment, useInboundShipment } from '../../api';
import { InboundItem } from '../../../types';
import {
  canReturnInboundLines,
  getInboundStockLines,
  isInboundPlaceholderRow,
} from '../../../utils';
import { useInboundShipmentColumns } from '../columns';
import { ScannedBatchData, ScannedItem } from '../types';

const TABLE_ID = 'inbound-shipment-detail-view';
const EXTERNAL_TABLE_ID = 'inbound-shipment-detail-view-external';

type InboundLineItem = InboundLineFragment['item'];

export interface DetailsTabLineEdit {
  isOpen: boolean;
  mode: ModalMode | null;
  entity: InboundLineItem | ScannedItem | null;
  onOpen: (entity?: InboundLineItem | ScannedItem | null) => void;
  onClose: () => void;
  setMode: (mode: ModalMode) => void;
}

interface DetailsTabProps {
  /**
   * Line-edit modal state lives in `DetailView` so the `AppBarButtons` "Add
   * Item" control (rendered outside this tab) can also open it. The modal
   * itself is rendered here so it can read table-derived data (sort order,
   * row context) without leaking the table into the parent.
   */
  lineEdit: DetailsTabLineEdit;
}

export const DetailsTab = ({ lineEdit }: DetailsTabProps) => {
  const t = useTranslation();
  const { info } = useNotification();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const {
    query: { data },
    isExternal,
    isDisabled,
  } = useInboundShipment();
  const { data: vvmStatuses } = useVvmStatusesEnabled();
  const hasItemVariantsEnabled = useIsItemVariantsEnabled();

  const lines = useMemo(
    () => (data ? getInboundStockLines(data.lines.nodes) : []),
    [data]
  );
  const showLineStatus =
    data?.lines.nodes.some(line => line.status != null) ?? false;
  const columns = useInboundShipmentColumns(isExternal, showLineStatus);

  const canAddItem = !isDisabled && !isExtraSmallScreen;

  const [editPurchaseOrderLineId, setEditPurchaseOrderLineId] = useState<
    string | null
  >(null);
  const [scrollToLineId, setScrollToLineId] = useState<string | null>(null);

  const {
    onOpen: onOpenReturns,
    onClose: onCloseReturns,
    isOpen: returnsIsOpen,
    entity: stockLineIds,
    mode: returnModalMode,
  } = useEditModal<string[]>();

  const onRowClick = useCallback(
    (line: InboundItem | InboundLineFragment) => {
      if ('lines' in line) {
        const firstLine = line.lines[0];
        lineEdit.onOpen(firstLine?.item);
        setEditPurchaseOrderLineId(firstLine?.purchaseOrderLine?.id ?? null);
        setScrollToLineId(firstLine?.id ?? null);
      } else {
        lineEdit.onOpen(line.item);
        setEditPurchaseOrderLineId(line.purchaseOrderLine?.id ?? null);
        setScrollToLineId(line.id);
      }
    },
    [lineEdit]
  );

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<InboundLineFragment>({
      tableId: isExternal ? EXTERNAL_TABLE_ID : TABLE_ID,
      columns,
      data: lines,
      grouping: isExternal
        ? {
            field: 'purchaseOrderLine.lineNumber',
            label: t('label.group-by-po-line'),
          }
        : { field: 'item.code' },
      isLoading: false,
      initialSort: { key: 'itemName', dir: 'asc' },
      onRowClick: canAddItem ? onRowClick : undefined,
      getIsPlaceholderRow: row => isInboundPlaceholderRow(row.original),
      noDataElement: (
        <NothingHere
          body={t('error.no-inbound-items')}
          onCreate={canAddItem ? () => lineEdit.onOpen() : undefined}
          buttonText={t('button.add-item')}
        />
      ),
      isMobile: isExtraSmallScreen,
    });

  const onReturn = useCallback(async () => {
    if (!data || !canReturnInboundLines(data)) {
      info(t('messages.cant-return-shipment-replenishment'))();
      return;
    }
    if (!selectedRows.length) {
      info(t('messages.select-rows-to-return'))();
      return;
    }
    if (selectedRows.some(line => !line.stockLine)) {
      info(t('messages.cant-return-lines-with-no-received-stock'))();
      return;
    }

    const selectedStockLineIds = selectedRows.map(
      line => line.stockLine?.id ?? ''
    );
    onOpenReturns(selectedStockLineIds);
  }, [data, selectedRows, info, onOpenReturns, t]);

  // The InboundLineEdit modal walks items in the current sort order when the
  // user hits "next"; capture the sort from this tab's table so the modal
  // doesn't need to read the URL itself.
  const getSortedItems = useCallback(
    () =>
      table.getSortedRowModel().rows.reduce<ItemRowFragment[]>((acc, row) => {
        const item = row.original.item;
        if (!acc.find(i => i.id === item.id)) acc.push(item);
        return acc;
      }, []),
    [table]
  );

  if (!data) return null;

  return (
    <>
      {isExtraSmallScreen ? (
        <CardList table={table} />
      ) : (
        <MaterialTable table={table} />
      )}
      <Footer
        onReturnLines={onReturn}
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
        showLineStatus={showLineStatus}
      />
      {lineEdit.isOpen && (
        <InboundLineEdit
          isDisabled={isDisabled}
          isOpen={lineEdit.isOpen}
          onClose={lineEdit.onClose}
          mode={lineEdit.mode}
          // "as" here is okay, as the child components will take care of
          // populating the item with the full details if they are missing
          // (which is the case when item info is scanned from barcode)
          item={lineEdit.entity as InboundLineItem}
          foreignCurrency={data.purchaseOrder?.currency ?? data.currency}
          isExternalSupplier={!data.otherParty.store}
          hasVvmStatusesEnabled={!!vvmStatuses && vvmStatuses.length > 0}
          hasItemVariantsEnabled={hasItemVariantsEnabled}
          purchaseOrderLineId={editPurchaseOrderLineId}
          scrollToLineId={scrollToLineId}
          scannedBatchData={{
            batch: (lineEdit.entity as ScannedBatchData)?.batch,
            expiryDate: (lineEdit.entity as ScannedBatchData)?.expiryDate,
          }}
          getSortedItems={getSortedItems}
        />
      )}
      {returnsIsOpen && (
        <SupplierReturnEditModal
          isOpen={returnsIsOpen}
          onCreate={table.resetRowSelection}
          onClose={onCloseReturns}
          stockLineIds={stockLineIds || []}
          supplierId={data.otherParty.id}
          modalMode={returnModalMode}
          inboundShipment={data}
          isNewReturn
        />
      )}
    </>
  );
};
