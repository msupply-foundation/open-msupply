import React, { useEffect } from 'react';
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
  GenericColumnKey,
  getCommentPopoverColumn,
  useNotification,
  usePreferences,
  useCallbackWithPermission,
  UserPermission,
} from '@openmsupply-client/common';
import { getStatusTranslator, isInboundListItemDisabled } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { CustomerReturnRowFragment, useReturns } from '../api';
import { Footer } from './Footer';

const CustomerReturnListViewComponent = () => {
  const t = useTranslation();
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
  const { info } = useNotification();
  const { disableManualReturns } = usePreferences();

  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };

  const { mutate } = useReturns.document.updateCustomerReturn();

  const onUpdateColour: ColumnDataSetter<CustomerReturnRowFragment> = ({
    id,
    colour,
  }) => {
    mutate({ id, colour });
  };

  const { data, isError, isLoading } =
    useReturns.document.listCustomer(queryParams);

  useEffect(() => {
    const disabledRows = data?.nodes
      .filter(isInboundListItemDisabled)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [data?.nodes, setDisabledRows]);

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

  const columns = useColumns<CustomerReturnRowFragment>(
    [
      GenericColumnKey.Selection,
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
      getCommentPopoverColumn(),
      [
        'theirReference',
        {
          Cell: TooltipTextCell,
          width: 125,
        },
      ],
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons modalController={modalController} onNew={handleClick} />

      <DataTable
        id="customer-return-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-customer-returns')}
            onCreate={handleClick}
          />
        }
        onRowClick={row => {
          navigate(row.id);
        }}
      />
      <Footer />
    </>
  );
};

export const CustomerReturnListView = () => (
  <TableProvider createStore={createTableStore}>
    <CustomerReturnListViewComponent />
  </TableProvider>
);
