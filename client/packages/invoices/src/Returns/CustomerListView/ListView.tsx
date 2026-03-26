import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnDataSetter,
  useNotification,
  usePreferences,
  useCallbackWithPermission,
  UserPermission,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  NameAndColorSetterCell,
  ColumnType,
  TextWithTooltipCell,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { getStatusTranslator, isInboundListItemDisabled } from '../../utils';
import { AppBarButtons } from './AppBarButtons';
import { CustomerReturnRowFragment, useReturns } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { getStatusSequence } from '../../statuses';

export const CustomerReturnListView = () => {
  const t = useTranslation();
  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'status', condition: 'equalTo' },
    ],
  });
  const navigate = useNavigate();
  const modalController = useToggle();
  const { info } = useNotification();
  const { disableManualReturns } = usePreferences();
    const { invoiceStatusOptions } = usePreferences();
  const statuses = getStatusSequence(InvoiceNodeType.CustomerReturn).filter(
    status => invoiceStatusOptions?.includes(status)
  );

  const queryParams = { ...filter, sortBy, first, offset };

  const { mutate } = useReturns.document.updateCustomerReturn();

  const onUpdateColour: ColumnDataSetter<CustomerReturnRowFragment> = ({
    id,
    colour,
  }) => {
    mutate({ id, colour });
  };

  const { data, isError, isFetching } =
    useReturns.document.listCustomer(queryParams);

  const openModal = useCallbackWithPermission(
    UserPermission.CustomerReturnMutate,
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
    (): ColumnDef<CustomerReturnRowFragment>[] => [
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
            getIsDisabled={isInboundListItemDisabled}
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
        filterSelectOptions: statuses.map(status => ({
          value: status,
          label: getStatusTranslator(t)(status),
        })),
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
        enableSorting: true,
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        Cell: TextWithTooltipCell,
      },
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'customer-return-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    getIsRestrictedRow: row => isInboundListItemDisabled(row.original),
    onRowClick: r => navigate(r.id),
    noDataElement: (
      <NothingHere
        body={t('error.no-customer-returns')}
        onCreate={handleClick}
      />
    ),
  });

  return (
    <>
      <Toolbar />
      <AppBarButtons modalController={modalController} onNew={handleClick} />

      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
