import React from 'react';
import { LinkedRequestRowFragment } from '../api';
import {
  useColumns,
  getNotePopoverColumn,
  ColumnAlign,
  BasicModal,
  DataTable,
  ModalTitle,
  useWindowDimensions,
  useTranslation,
} from '@openmsupply-client/common';

interface LinkInternalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestRequisitions?: LinkedRequestRowFragment[];
  onRowClick: (row: LinkedRequestRowFragment) => void;
  isLoading: boolean;
}

export const LinkInternalOrderModal = ({
  isOpen,
  onClose,
  requestRequisitions: data,
  onRowClick,
  isLoading,
}: LinkInternalOrderModalProps) => {
  const t = useTranslation();
  const { width, height } = useWindowDimensions();

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
    <BasicModal
      open={isOpen}
      onClose={onClose}
      width={width * 0.5}
      height={height * 0.8}
    >
      <ModalTitle title={t('header.link-internal-order')} />
      <DataTable
        id="link-internal-order-to-inbound"
        columns={columns}
        data={data ?? []}
        dense
        onRowClick={onRowClick}
        isLoading={isLoading}
      />
    </BasicModal>
  );
};
