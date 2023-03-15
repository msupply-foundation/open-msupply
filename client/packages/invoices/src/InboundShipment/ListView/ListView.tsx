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
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStatusTranslator, isInboundDisabled } from '../../utils';
import { useInbound, InboundRowFragment } from '../api';

const useDisableInboundRows = (rows?: InboundRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isInboundDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const InboundListView: FC = () => {
  const { mutate: onUpdate } = useInbound.document.update();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filterKey: 'otherPartyName' });
  const navigate = useNavigate();
  const modalController = useToggle();
  const { data, isError, isLoading } = useInbound.document.list();
  const pagination = { page, first, offset };
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
      'deliveredDatetime',
      ['comment', { width: '100%' }],
      'theirReference',
      [
        'totalAfterTax',
        {
          accessor: ({ rowData }) => rowData.pricing.totalAfterTax,
        },
      ],
      'selection',
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} modalController={modalController} />

      <DataTable
        id="inbound-line-list"
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={updatePaginationQuery}
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
        enableColumnSelection
      />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider store={createTableStore()}>
    <InboundListView />
  </TableProvider>
);
