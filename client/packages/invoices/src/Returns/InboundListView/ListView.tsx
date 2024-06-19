import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  useTranslation,
  InvoiceNodeStatus,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnDataSetter,
  useTableStore,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { getStatusTranslator, isInboundListItemDisabled } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { InboundReturnRowFragment, useReturns } from '../api';

const InboundReturnListViewComponent: FC = () => {
  const t = useTranslation('distribution');
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'status', condition: 'equalTo' },
    ],
  });
  const { setDisabledRows } = useTableStore();
  const navigate = useNavigate();
  const modalController = useToggle();
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };

  const { mutate } = useReturns.document.updateInboundReturn();

  const onUpdateColour: ColumnDataSetter<InboundReturnRowFragment> = ({
    id,
    colour,
  }) => {
    mutate({ id, colour });
  };

  const { data, isError, isLoading } =
    useReturns.document.listInbound(queryParams);

  useEffect(() => {
    const disabledRows = data?.nodes
      .filter(isInboundListItemDisabled)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [data?.nodes, setDisabledRows]);

  const columns = useColumns<InboundReturnRowFragment>(
    [
      [getNameAndColorColumn(), { setter: onUpdateColour }],
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as InvoiceNodeStatus),
        },
      ],
      [
        'invoiceNumber',
        { description: 'description.invoice-number', width: 145 },
      ],
      ['createdDatetime', { width: 150 }],
      ['comment', { width: 125, Cell: TooltipTextCell }],
      [
        'theirReference',
        {
          Cell: TooltipTextCell,
          width: 125,
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
        id="inbound-return-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-inbound-returns')}
            onCreate={modalController.toggleOn}
          />
        }
        onRowClick={row => {
          navigate(String(row.invoiceNumber));
        }}
      />
    </>
  );
};

export const InboundReturnListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <InboundReturnListViewComponent />
  </TableProvider>
);
