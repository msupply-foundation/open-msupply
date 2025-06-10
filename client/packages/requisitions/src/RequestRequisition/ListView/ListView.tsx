import React, { FC, useCallback, useEffect } from 'react';
import {
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  getNameAndColorColumn,
  useNavigate,
  useTranslation,
  RequisitionNodeStatus,
  useTableStore,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnDescription,
  GenericColumnKey,
  getCommentPopoverColumn,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { RequestRowFragment, useRequest } from '../api';
import {
  getApprovalStatusKey,
  getRequisitionTranslator,
  isRequestDisabled,
} from '../../utils';
import { Footer } from './Footer';

const useDisableRequestRows = (rows?: RequestRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isRequestDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const RequestRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const modalController = useToggle();
  const { data: programSettings } = useRequest.utils.programSettings();

  const { mutate: onUpdate } = useRequest.document.update();
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
  const queryParams = { ...filter, sortBy, first, offset };
  const pagination = { page, first, offset };

  const { data, isError, isLoading } = useRequest.document.list(queryParams);
  useDisableRequestRows(data?.nodes);
  const { requireSupplierAuthorisation } = useRequest.utils.preferences();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const columnDefinitions: ColumnDescription<RequestRowFragment>[] = [
    GenericColumnKey.Selection,
    [getNameAndColorColumn(), { setter: onUpdate }],
    {
      key: 'requisitionNumber',
      label: 'label.number',
      width: 90,
    },
    ['createdDatetime', { width: 150 }],
  ];

  if (simplifiedTabletView) {
    columnDefinitions.push({
      key: 'count',
      label: 'label.count-rows',
      width: 110,
      accessor: ({ rowData }: { rowData: RequestRowFragment }) =>
        rowData.lines.totalCount,
    });
  }

  if (programSettings && programSettings.length > 0) {
    columnDefinitions.push(
      {
        key: 'programName',
        accessor: ({ rowData }) => rowData.programName,
        label: 'label.program',
        description: 'description.program',
        sortable: true,
        width: 150,
        defaultHideOnMobile: true,
      },
      {
        key: 'orderType',
        accessor: ({ rowData }) => rowData.orderType,
        label: 'label.order-type',
        sortable: true,
        width: 100,
        defaultHideOnMobile: true,
      },
      {
        key: 'period',
        accessor: ({ rowData }) => rowData.period?.name ?? '',
        label: 'label.period',
        sortable: true,
        defaultHideOnMobile: true,
      }
    );
  }

  columnDefinitions.push(
    [
      'status',
      {
        width: 100,
        formatter: currentStatus =>
          getRequisitionTranslator(t)(currentStatus as RequisitionNodeStatus),
      },
    ],
    getCommentPopoverColumn()
  );

  if (requireSupplierAuthorisation) {
    columnDefinitions.push({
      key: 'approvalStatus',
      label: 'label.auth-status',
      minWidth: 150,
      sortable: false,
      accessor: ({ rowData }) =>
        t(getApprovalStatusKey(rowData.linkedRequisition?.approvalStatus)),
    });
  }

  const columns = useColumns<RequestRowFragment>(
    columnDefinitions,
    { sortBy, onChangeSortBy: updateSortQuery },
    [sortBy]
  );

  const onRowClick = useCallback(
    (row: RequestRowFragment) => {
      navigate(String(row.id));
    },
    [navigate]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons modalController={modalController} />

      <DataTable
        id="internal-order-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        onRowClick={onRowClick}
        isError={isError}
        isLoading={isLoading}
        enableColumnSelection
        noDataElement={
          <NothingHere
            body={t('error.no-internal-orders')}
            onCreate={modalController.toggleOn}
          />
        }
      />
      <Footer />
    </>
  );
};

export const ListView = () => (
  <TableProvider createStore={createTableStore}>
    <RequestRequisitionListView />
  </TableProvider>
);
