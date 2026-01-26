import React, { useMemo } from 'react';
import { useDialog, useWindowDimensions } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { LinkedRequestLineFragment, useInbound } from '../api';
import {
  ColumnDef,
  ColumnType,
  DialogButton,
  MaterialTable,
  useNonPaginatedMaterialTable,
} from '@openmsupply-client/common';

interface AddFromInternalOrderProps {
  isOpen: boolean;
  onClose: () => void;
  requisitionId?: string;
  invoiceId?: string;
}

export const AddFromInternalOrder = ({
  isOpen,
  onClose,
  requisitionId,
  invoiceId,
}: AddFromInternalOrderProps) => {
  const t = useTranslation();
  const { width, height } = useWindowDimensions();
  const { Modal } = useDialog({ isOpen, onClose });
  const { mutateAsync } = useInbound.lines.insertFromInternalOrder();
  const { data, isLoading } = useInbound.document.listInternalOrderLines(
    requisitionId ?? ''
  );

  const columns = useMemo(
    (): ColumnDef<LinkedRequestLineFragment>[] => [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        size: 200,
        enableSorting: true,
      },
      {
        accessorKey: 'requestedQuantity',
        header: t('label.requested-quantity'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
    ],
    []
  );

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<LinkedRequestLineFragment>({
      tableId: 'link-internal-order-to-inbound',
      columns,
      data: data?.lines.nodes,
      isLoading,
    });

  const onSelect = async () => {
    const rowsToInsert = selectedRows.map(row => ({
      invoiceId: invoiceId ?? '',
      requisitionLineId: row.id,
    }));

    await mutateAsync(rowsToInsert);
    onClose();
  };

  return (
    <Modal
      title={t('header.add-lines-from-internal-order')}
      width={width * 0.5}
      height={height * 0.8}
      okButton={<DialogButton variant="select" onClick={onSelect} />}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <MaterialTable table={table} />
    </Modal>
  );
};
