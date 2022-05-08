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
  useTableStore,
  NothingHere,
  useToggle,
  createQueryParamsStore,
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
  const modalController = useToggle();
  const { data, isError, isLoading, sort, pagination, filter } = useInbounds();
  const { sortBy, onChangeSortBy } = sort;
  useDisableInboundRows(data?.nodes);

  const t = useTranslation('replenishment');

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
      ['comment', { width: '100%' }],
      [
        'totalAfterTax',
        {
          accessor: ({ rowData }) => rowData.pricing.totalAfterTax,
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
      <AppBarButtons sortBy={sortBy} modalController={modalController} />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={pagination.onChangePage}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(String(row.invoiceNumber));
        }}
        isError={isError}
        noDataElement={
          <NothingHere
            body={t('error.no-inbound-shipments')}
            onCreate={modalController.toggleOn}
          />
        }
      />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<InboundRowFragment>({
      initialSortBy: { key: 'otherPartyName' },
    })}
  >
    <InboundListView />
  </TableProvider>
);
