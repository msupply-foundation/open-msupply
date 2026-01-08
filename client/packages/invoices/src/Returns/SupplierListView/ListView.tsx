import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  InvoiceNodeStatus,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnDataSetter,
  useCallbackWithPermission,
  UserPermission,
  usePreferences,
  useNotification,
  ColumnDef,
  NameAndColorSetterCell,
  ColumnType,
  TextWithTooltipCell,
  usePaginatedMaterialTable,
  MaterialTable,
} from '@openmsupply-client/common';
import { getStatusTranslator, isOutboundDisabled } from '../../utils';
import { AppBarButtons } from './AppBarButtons';
import { SupplierReturnRowFragment, useReturns } from '../api';
import { Footer } from './Footer';

export const SupplierReturnListView = () => {
  const t = useTranslation();
  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'status', condition: 'equalTo' },
      { key: 'createdDatetime', condition: 'between' },
    ],
  });
  const navigate = useNavigate();
  const modalController = useToggle();
  const { info } = useNotification();
  const { disableManualReturns } = usePreferences();

  const queryParams = { ...filter, sortBy, first, offset };

  const { data, isError, isFetching } =
    useReturns.document.listSupplier(queryParams);

  const { mutate } = useReturns.document.updateSupplierReturn();

  const onUpdateColour: ColumnDataSetter<SupplierReturnRowFragment> = ({
    id,
    colour,
  }) => {
    mutate({ id, colour });
  };

  const openModal = useCallbackWithPermission(
    UserPermission.SupplierReturnMutate,
    modalController.toggleOn
  );

  const handleClick = (): void => {
    if (disableManualReturns) {
      info(t('messages.manual-returns-preferences-disabled'))();
      return;
    }
    openModal();
  };

  const columns = useMemo(
    (): ColumnDef<SupplierReturnRowFragment>[] => [
      {
        accessorKey: 'otherPartyName',
        header: t('label.name'),
        size: 250,
        enableSorting: true,
        enableColumnFilter: true,
        Cell: ({ row }) => (
          <NameAndColorSetterCell
            row={row.original}
            onColorChange={onUpdateColour}
            getIsDisabled={isOutboundDisabled}
          />
        ),
      },
      {
        id: 'status',
        header: t('label.status'),
        accessorFn: row => getStatusTranslator(t)(row.status),
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          { label: t('label.new'), value: InvoiceNodeStatus.New },
          { label: t('label.picked'), value: InvoiceNodeStatus.Picked },
          { label: t('label.shipped'), value: InvoiceNodeStatus.Shipped },
          {
            label: t('label.delivered'),
            value: InvoiceNodeStatus.Delivered,
          },
          {
            label: t('label.verified'),
            value: InvoiceNodeStatus.Verified,
          },
        ],
      },
      {
        accessorKey: 'invoiceNumber',
        header: t('label.invoice-number'),
        description: t('description.invoice-number'),
        enableSorting: true,
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created-datetime'),
        enableColumnFilter: true,
        enableSorting: true,
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        Cell: TextWithTooltipCell,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'supplier-return-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    getIsRestrictedRow: isOutboundDisabled,
    onRowClick: r => navigate(r.id),
    noDataElement: (
      <NothingHere
        body={t('error.no-supplier-returns')}
        onCreate={handleClick}
      />
    ),
  });

  return (
    <>
      <AppBarButtons modalController={modalController} onNew={handleClick} />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
