import React, { useMemo } from 'react';
import { InboundShipmentPurchaseOrderLineFragment } from '../api';
import {
  useWindowDimensions,
  useTranslation,
  useDialog,
  DialogButton,
  MaterialTable,
  ColumnDef,
  ColumnType,
  PurchaseOrderNodeStatus,
  useNonPaginatedMaterialTable,
} from '@openmsupply-client/common';
import { useListSentPurchaseOrders } from '../api/hooks/document/useListSentPurchaseOrders';

interface LinkInternalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  handlePurchaseOrderSelected: (
    purchaseOrder: InboundShipmentPurchaseOrderLineFragment,
    addLinesFromPurchaseOrder: boolean
  ) => void;
}

export const LinkPurchaseOrderModal = ({
  isOpen,
  onClose,
  handlePurchaseOrderSelected,
}: LinkInternalOrderModalProps) => {
  const t = useTranslation();
  const { width, height } = useWindowDimensions();
  const { Modal } = useDialog({ isOpen, onClose });

  const filterBy = {
    status: { equalTo: PurchaseOrderNodeStatus.Sent },
  };
  const { data, isLoading, isError } = useListSentPurchaseOrders(filterBy, isOpen);

  const columns = useMemo(
    (): ColumnDef<InboundShipmentPurchaseOrderLineFragment>[] => [
      {
        accessorKey: 'supplier.name',
        header: t('label.supplier'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'number',
        header: t('label.purchase-order-number'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'reference',
        header: t('label.reference'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
        size: 80,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<InboundShipmentPurchaseOrderLineFragment>({
      tableId: 'link-internal-order-to-inbound',
      columns,
      data: data?.nodes,
      enableMultiRowSelection: false,
      noUrlFiltering: true,
      getRowId: (row: InboundShipmentPurchaseOrderLineFragment) => row.id,
      isLoading,
      isError,
    });

  const onClick = (addLines: boolean) => {
    handlePurchaseOrderSelected(
      selectedRows[0] as InboundShipmentPurchaseOrderLineFragment,
      addLines
    );
    table.resetRowSelection();
  };

  const disabled = selectedRows.length == 0;

  return (
    <Modal
      title={t('heading.link-purchase-order')}
      width={width * 0.7}
      height={height * 0.8}
      okButton={
        <DialogButton
          variant="next"
          onClick={() => onClick(false)}
          customLabel={t('button.add-with-no-lines')}
          disabled={disabled}
        />
      }
      nextButton={
        <DialogButton
          variant="next"
          onClick={() => onClick(true)}
          customLabel={t('button.add-with-all-lines')}
          disabled={disabled}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <MaterialTable table={table} />
    </Modal>
  );
};
