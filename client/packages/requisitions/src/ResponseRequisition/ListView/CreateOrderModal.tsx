import React, { useMemo } from 'react';
import {
  ColumnAlign,
  useWindowDimensions,
  useTranslation,
  useDialog,
  DialogButton,
  RequisitionNodeStatus,
  ColumnDef,
  ColumnType,
  useNonPaginatedMaterialTable,
  NothingHere,
  MaterialTable,
} from '@openmsupply-client/common';
import { useResponse } from '../api';
import { ResponseRowFragment } from '../api/operations.generated';
import {
  InternalSupplierSearchModal,
  NameRowFragment,
} from '@openmsupply-client/system';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRowClick: (requisition: ResponseRowFragment) => void;
  selectedSupplier?: NameRowFragment;
  setSelectedSupplier: (supplier: NameRowFragment) => void;
}

export const CreateOrderModal = ({
  isOpen,
  onClose,
  onRowClick,
  selectedSupplier,
  setSelectedSupplier,
}: CreateOrderModalProps) => {
  const t = useTranslation();
  const { width, height } = useWindowDimensions();
  const { Modal } = useDialog({ isOpen, onClose });

  const { data, isLoading } = useResponse.document.list({
    filterBy: {
      status: { notEqualTo: RequisitionNodeStatus.Finalised },
      hasOutstandingLines: true,
      otherPartyId: { notEqualTo: selectedSupplier?.id },
    },
  });

  const columns = useMemo(() => {
    const cols: ColumnDef<ResponseRowFragment>[] = [
      {
        accessorKey: 'requisitionNumber',
        header: t('label.number'),
        size: 80,
        align: ColumnAlign.Right,
      },
      {
        accessorKey: 'otherPartyName',
        header: t('label.customer'),
        size: 200,
        accessorFn: row => row.otherPartyName || '',
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created-datetime'),
        size: 120,
        align: ColumnAlign.Right,
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'programName',
        header: t('label.program'),
        size: 200,
        accessorFn: row => row.programName || '',
      },
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        size: 150,
      },
      {
        accessorKey: 'status',
        header: t('label.status'),
        size: 120,
      },
      {
        id: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
    ];
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { table } = useNonPaginatedMaterialTable<ResponseRowFragment>({
    tableId: 'create-order-from-requisition',
    columns,
    isLoading: isLoading,
    data: data?.nodes ?? [],
    onRowClick: onRowClick,
    initialSort: { key: 'createdDatetime', dir: 'asc' },
    enableRowSelection: false,
    noDataElement: (
      <NothingHere body={t('error.no-requisitions-to-create-order-from')} />
    ),
  });

  return (
    <>
      {isOpen && !selectedSupplier ? (
        <InternalSupplierSearchModal
          open={true}
          onClose={onClose}
          onChange={supplier => setSelectedSupplier(supplier)}
        />
      ) : null}
      {isOpen && !!selectedSupplier && (
        <Modal
          title={t('button.create-order')}
          width={width * 0.8}
          height={height * 0.8}
          cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
        >
          <MaterialTable table={table} />
        </Modal>
      )}
    </>
  );
};
