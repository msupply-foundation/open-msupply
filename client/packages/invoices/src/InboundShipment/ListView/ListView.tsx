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
  TooltipTextCell,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStatusTranslator, isInboundListItemDisabled } from '../../utils';
import { useInbound, InboundRowFragment } from '../api';

const useDisableInboundRows = (rows?: InboundRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows
      ?.filter(isInboundListItemDisabled)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
};

export const InboundListView: FC = () => {
  const { mutate: onUpdate } = useInbound.document.update();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    filters: [
      { key: 'otherPartyName' },
      {
        key: 'createdDatetime',
        condition: 'between',
      },
      { key: 'status', condition: 'equalTo' },
    ],
  });
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };

  const navigate = useNavigate();
  const modalController = useToggle();

  const { data, isError, isLoading } = useInbound.document.list(queryParams);
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
      ['comment', { width: 125, Cell: TooltipTextCell }],
      [
        'theirReference',
        {
          Cell: TooltipTextCell,
        },
      ],
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
      <AppBarButtons modalController={modalController} />

      <DataTable
        id="inbound-line-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
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
  <TableProvider createStore={createTableStore}>
    <InboundListView />
  </TableProvider>
);
