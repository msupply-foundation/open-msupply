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
  GenericColumnKey,
  getCommentPopoverColumn,
  useCallbackWithPermission,
  UserPermission,
  usePreference,
  PreferenceKey,
  useNotification,
} from '@openmsupply-client/common';
import { getStatusTranslator, isOutboundDisabled } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { SupplierReturnRowFragment, useReturns } from '../api';
import { Footer } from './Footer';

const SupplierReturnListViewComponent: FC = () => {
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
  const { data: preferences } = usePreference(
    PreferenceKey.DisableManualReturns
  );

  const disableManualReturns = preferences?.disableManualReturns ?? false;
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };

  const { data, isError, isLoading } =
    useReturns.document.listSupplier(queryParams);

  useEffect(() => {
    const disabledRows = data?.nodes
      .filter(isOutboundDisabled)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [data?.nodes, setDisabledRows]);

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

  const columns = useColumns<SupplierReturnRowFragment>(
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
        { description: 'description.invoice-number', width: 150 },
      ],
      'createdDatetime',
      getCommentPopoverColumn(),
      [
        'theirReference',
        {
          Cell: TooltipTextCell,
          width: 150,
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
        id="supplier-return-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-supplier-returns')}
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

export const SupplierReturnListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <SupplierReturnListViewComponent />
  </TableProvider>
);
