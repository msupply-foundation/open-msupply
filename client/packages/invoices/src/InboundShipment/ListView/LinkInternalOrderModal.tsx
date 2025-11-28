import React from 'react';
import { LinkedRequestRowFragment, useInbound } from '../api';
import {
  useColumns,
  getNotePopoverColumn,
  ColumnAlign,
  DataTable,
  useWindowDimensions,
  useTranslation,
  useDialog,
  DialogButton,
  Typography,
  TableProvider,
  createTableStore,
} from '@openmsupply-client/common';
import { NameRowFragment } from '@openmsupply-client/system';

interface LinkInternalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRowClick: (row: LinkedRequestRowFragment) => void;
  onNextClick: () => void;
  name: NameRowFragment | null;
}

export const LinkInternalOrderModal = ({
  isOpen,
  onClose,
  onRowClick,
  onNextClick: createInvoice,
  name,
}: LinkInternalOrderModalProps) => {
  const t = useTranslation();
  const { width, height } = useWindowDimensions();
  const { Modal } = useDialog({ isOpen, onClose });
  const { data, isLoading } = useInbound.document.listInternalOrders(
    name?.id ?? ''
  );

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
      width={width * 0.7}
      height={height * 0.8}
      nextButton={<DialogButton variant="next" onClick={createInvoice} />}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <>
        <Typography
          sx={{
            fontStyle: 'italic',
          }}
        >
          {t('message.continue-to-make-inbound-shipment')}
        </Typography>

        <TableProvider createStore={createTableStore}>
          <DataTable
            id="link-internal-order-to-inbound"
            columns={columns}
            data={data?.nodes ?? []}
            dense
            onRowClick={onRowClick}
            isLoading={isLoading}
          />
        </TableProvider>
      </>
    </Modal>
  );
};
