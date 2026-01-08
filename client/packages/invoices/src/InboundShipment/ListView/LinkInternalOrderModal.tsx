import React, { useMemo } from 'react';
import { LinkedRequestRowFragment, useInbound } from '../api';
import {
  useWindowDimensions,
  useTranslation,
  useDialog,
  DialogButton,
  Typography,
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  ColumnType,
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

  const columns = useMemo(
    (): ColumnDef<LinkedRequestRowFragment>[] => [
      {
        accessorKey: 'requisitionNumber',
        header: t('label.number'),
        columnType: ColumnType.Number,
        size: 80,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        columnType: ColumnType.Date,
        size: 80,
      },
      {
        accessorKey: 'user.username',
        header: t('label.entered-by'),
        size: 150,
      },
      {
        accessorKey: 'program.name',
        header: t('label.program'),
        size: 200,
      },
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        size: 150,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
    ],
    []
  );

  const table = useSimpleMaterialTable<LinkedRequestRowFragment>({
    tableId: 'link-internal-order-to-inbound',
    columns,
    data: data?.nodes,
    isLoading,
    onRowClick,
  });

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
        <MaterialTable table={table} />
      </>
    </Modal>
  );
};
