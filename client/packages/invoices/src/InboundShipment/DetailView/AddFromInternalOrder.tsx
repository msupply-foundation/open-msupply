import React from 'react';
import { useDialog, useWindowDimensions } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { LinkedRequestLineFragment, useInbound } from '../api';
import {
  DataTable,
  DialogButton,
  GenericColumnKey,
  useColumns,
} from 'packages/common/src';

interface AddFromInternalOrderProps {
  isOpen: boolean;
  onClose: () => void;
  requisitionId?: string;
}

export const AddFromInternalOrder = ({
  isOpen,
  onClose,
  requisitionId,
}: AddFromInternalOrderProps) => {
  const t = useTranslation();
  const { data, isLoading } = useInbound.document.listInternalOrderLines(
    requisitionId ?? ''
  );

  const { width, height } = useWindowDimensions();
  const { Modal } = useDialog({ isOpen, onClose });
  const orderedLines = data?.lines?.nodes?.sort(
    (a, b) => b.requestedQuantity - a.requestedQuantity
  );

  const columns = useColumns<LinkedRequestLineFragment>([
    [
      GenericColumnKey.Selection,
      {
        width: 50,
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

  return (
    <Modal
      title={t('header.link-internal-order')}
      width={width * 0.5}
      height={height * 0.8}
      okButton={<DialogButton variant="select" onClick={() => {}} />}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <DataTable
        id="link-internal-order-to-inbound"
        columns={columns}
        data={orderedLines}
        dense
        isLoading={isLoading}
      />
    </Modal>
  );
};
