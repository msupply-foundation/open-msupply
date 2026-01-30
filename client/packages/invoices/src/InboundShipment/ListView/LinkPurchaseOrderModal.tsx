import React, { useMemo, useState } from 'react';
import { InboundShipmentPurchaseOrderLineFragment, useInbound } from '../api';
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
import { MRT_RowSelectionState } from 'material-react-table';

interface LinkInternalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  handlePurchaseOrderSelected: (purchaseOrder: InboundShipmentPurchaseOrderLineFragment, addLinesFromPurchaseOrder: boolean) => void;
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
    status: { equalTo: PurchaseOrderNodeStatus.Sent }
  };
  const { data, isLoading } = useInbound.document.listSentPurchaseOrders(filterBy);

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
        enableColumnFilter: true,
        size: 80,
      },
    ],
    []
  );

  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});

  const { table, selectedRows } = useNonPaginatedMaterialTable<InboundShipmentPurchaseOrderLineFragment>({
    tableId: 'link-internal-order-to-inbound',
    columns,
    data: data?.nodes,
    enableMultiRowSelection: false,
    getRowId: row => row.id,
    muiTableBodyRowProps: ({ row }) => ({
      // add onClick to row to select upon clicking anywhere in the row
      onClick: row.getToggleSelectedHandler(),
      sx: { cursor: 'pointer' },
    }),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    isLoading,
  });

  const onClick = (addLines: boolean) => {
    handlePurchaseOrderSelected(
      selectedRows[0] as InboundShipmentPurchaseOrderLineFragment,
      addLines
    );
    setRowSelection({});
  }

  const disabled = selectedRows.length == 0;

  return (
    <Modal
      title={t('heading.link-purchase-order')}
      width={width * 0.7}
      height={height * 0.8}
      okButton={<DialogButton
        variant="next"
        onClick={() => onClick(false)}
        customLabel={t('button.add-with-no-lines')}
        disabled={disabled}
      />}
      nextButton={<DialogButton
        variant="next"
        onClick={() => onClick(true)}
        customLabel={t('button.add-with-all-lines')}
        disabled={disabled}
      />}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <MaterialTable table={table} />
    </Modal>
  );
};
