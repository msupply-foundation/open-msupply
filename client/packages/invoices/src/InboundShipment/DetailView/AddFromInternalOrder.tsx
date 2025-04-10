import React from 'react';
import { useDialog, useWindowDimensions } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { LinkedRequestLineFragment, useInbound } from '../api';
import {
  ColumnAlign,
  createTableStore,
  DataTable,
  DialogButton,
  GenericColumnKey,
  TableProvider,
  useColumns,
  useTableStore,
} from '@openmsupply-client/common';

interface AddFromInternalOrderProps {
  isOpen: boolean;
  onClose: () => void;
  requisitionId?: string;
  invoiceId?: string;
}

export const useInternalOrderLineColumns = (requisitionId: string) => {
  const { data, isLoading } = useInbound.document.listInternalOrderLines(
    requisitionId ?? ''
  );
  const lines = data?.lines?.nodes;

  const columns = useColumns<LinkedRequestLineFragment>([
    [
      GenericColumnKey.Selection,
      {
        width: 50,
        align: ColumnAlign.Center,
      },
    ],
    [
      'itemCode',
      {
        width: 100,
        accessor: ({ rowData }) => rowData.item.code ?? '',
      },
    ],
    [
      'itemName',
      {
        width: 200,
        accessor: ({ rowData }) => rowData.item.name ?? '',
      },
    ],
    ['requestedQuantity'],
  ]);

  return { columns, lines, isLoading };
};

const AddFromInternalOrderComponent = ({
  isOpen,
  onClose,
  requisitionId,
  invoiceId,
}: AddFromInternalOrderProps) => {
  const t = useTranslation();
  const { width, height } = useWindowDimensions();
  const { Modal } = useDialog({ isOpen, onClose });
  const { columns, lines, isLoading } = useInternalOrderLineColumns(
    requisitionId ?? ''
  );
  const { mutateAsync } = useInbound.lines.insertFromInternalOrder();
  const selectedRows = useTableStore(state => {
    return lines?.filter(({ id }) => state.rowState[id]?.isSelected) ?? [];
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
      <DataTable
        id="link-internal-order-to-inbound"
        columns={columns}
        data={lines}
        isLoading={isLoading}
        dense
      />
    </Modal>
  );
};

export const AddFromInternalOrder = (props: AddFromInternalOrderProps) => (
  <TableProvider createStore={createTableStore}>
    <AddFromInternalOrderComponent {...props} />
  </TableProvider>
);
