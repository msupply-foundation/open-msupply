import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { getStatusTranslator } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { OutboundReturnRowFragment, useReturns } from '../api';

// const useDisableOutboundRows = (rows?: OutboundReturnRowFragment[]) => {
//   const { setDisabledRows } = useTableStore();
//   useEffect(() => {
//     const disabledRows = rows?.filter(isOutboundDisabled).map(({ id }) => id);
//     if (disabledRows) setDisabledRows(disabledRows);
//   }, [rows]);
// };

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
  const navigate = useNavigate();
  const modalController = useToggle();
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };

  const { data, isError, isLoading } =
    useReturns.document.listOutbound(queryParams);
  // useDisableOutboundRows(data?.nodes);

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
