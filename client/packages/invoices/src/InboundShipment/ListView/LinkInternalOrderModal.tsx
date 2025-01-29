import React from 'react';
import { LinkedRequestRowFragment } from '../api';
import {
  useColumns,
  getNotePopoverColumn,
  ColumnAlign,
  DataTable,
  useWindowDimensions,
  useTranslation,
  useDialog,
  DialogButton,
} from '@openmsupply-client/common';

interface LinkInternalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestRequisitions?: LinkedRequestRowFragment[];
  onRowClick: (row: LinkedRequestRowFragment) => void;
  isLoading: boolean;
  onNextClick: () => void;
}

export const LinkInternalOrderModal = ({
  isOpen,
  onClose,
  requestRequisitions: data,
  onRowClick,
  isLoading,
  onNextClick: createInvoice,
}: LinkInternalOrderModalProps) => {
  const t = useTranslation();
  const { width, height } = useWindowDimensions();
  const { Modal } = useDialog({ isOpen, onClose });

  const columns = useColumns<LinkedRequestRowFragment>([
    {
      key: 'requisitionNumber',
      label: 'label.number',
      width: 80,
      align: ColumnAlign.Right,
    },
    ['createdDatetime', { width: 80, align: ColumnAlign.Right }],
    {
      key: 'username',
      label: 'label.entered-by',
      width: 150,
      accessor: ({ rowData }) => rowData?.user?.username ?? '',
    },
    {
      key: 'programName',
      label: 'label.program',
      accessor: ({ rowData }) => rowData.program?.name ?? '',
      width: 200,
    },
    ['theirReference', { width: 150 }],
    [
      getNotePopoverColumn(),
      {
        accessor: ({ rowData }) => {
          return { header: '', body: rowData.comment };
        },
      },
    ],
  ]);

  return (
    <Modal
      title={t('header.link-internal-order')}
      width={width * 0.5}
      height={height * 0.8}
      nextButton={<DialogButton variant="next" onClick={createInvoice} />}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <DataTable
        id="link-internal-order-to-inbound"
        columns={columns}
        data={data ?? []}
        dense
        onRowClick={onRowClick}
        isLoading={isLoading}
      />
    </Modal>
  );
};
