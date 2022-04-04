import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  InvoiceNodeStatus,
  useTranslation,
  useCurrency,
  useTableStore,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStatusTranslator, isInboundDisabled } from '../../utils';
import { useInbounds, useUpdateInbound, InboundRowFragment } from '../api';

const useDisableInboundRows = (rows?: InboundRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isInboundDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const InboundListView: FC = () => {
  const { mutate: onUpdate } = useUpdateInbound();
  const navigate = useNavigate();
  const { c } = useCurrency();
  const {
    data,
    isError,
    isLoading,
    sortBy,
    onChangeSortBy,
    onChangePage,
    pagination,
    filter,
  } = useInbounds();
  useDisableInboundRows(data?.nodes);

  const t = useTranslation();

  const columns = useColumns<InboundRowFragment>(
    [
      [getNameAndColorColumn(), { setter: onUpdate }],
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as InvoiceNodeStatus),
        },
      ],
      ['invoiceNumber', { maxWidth: 80 }],
      'createdDatetime',
      'allocatedDatetime',
      ['comment', { maxWidth: 300 }],
      [
        'totalAfterTax',
        {
          accessor: ({ rowData }) => c(rowData.pricing.totalAfterTax).format(),
        },
      ],
      'selection',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(String(row.invoiceNumber));
        }}
        isError={isError}
      />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <InboundListView />
    </TableProvider>
  );
};
