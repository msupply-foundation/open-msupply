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
import { getStatusTranslator, isOutboundDisabled } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { OutboundReturnRowFragment, useReturns } from '../api';

const OutboundReturnListViewComponent: FC = () => {
  const t = useTranslation('replenishment');
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

  const { data, isError, isLoading } =
    useReturns.document.listOutbound(queryParams);

  useEffect(() => {
    const disabledRows = data?.nodes
      .filter(isOutboundDisabled)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [data?.nodes, setDisabledRows]);

  const { mutate } = useReturns.document.updateOutboundReturn();

  const onUpdateColour: ColumnDataSetter<OutboundReturnRowFragment> = ({
    id,
    colour,
  }) => {
    mutate({ id, colour });
  };

  const columns = useColumns<OutboundReturnRowFragment>(
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
        { description: 'description.invoice-number', maxWidth: 110 },
      ],
      'createdDatetime',
      ['comment', { width: 125, Cell: TooltipTextCell }],
      [
        'theirReference',
        {
          Cell: TooltipTextCell,
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
        id="outbound-return-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-outbound-returns')}
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

export const OutboundReturnListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <OutboundReturnListViewComponent />
  </TableProvider>
);
