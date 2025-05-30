import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  getNameAndColorColumn,
  useTableStore,
  RequisitionNodeStatus,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  ColumnDescription,
  useToggle,
  GenericColumnKey,
  getCommentPopoverColumn,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import {
  getApprovalStatusKey,
  getRequisitionTranslator,
  isResponseDisabled,
} from '../../utils';
import { useResponse, ResponseRowFragment } from '../api';
import { Footer } from './Footer';

const useDisableResponseRows = (rows?: ResponseRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isResponseDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const ResponseRequisitionListView: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const modalController = useToggle();
  const { mutate: onUpdate } = useResponse.document.update();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: {
      key: 'createdDatetime',
      dir: 'desc',
    },
    filters: [
      { key: 'comment' },
      { key: 'otherPartyName' },
      {
        key: 'status',
        condition: 'equalTo',
      },
      {
        key: 'aShipmentHasBeenCreated',
        condition: '=',
      },
      {
        key: 'isEmergency',
        condition: '=',
      },
    ],
  });
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, page, first, offset };
  const { data, isError, isLoading } = useResponse.document.list(queryParams);
  const { authoriseResponseRequisitions } = useResponse.utils.preferences();
  useDisableResponseRows(data?.nodes);
  const program =
    data?.nodes.some(row => row.programName) ||
    data?.nodes.some(row => row.orderType) ||
    data?.nodes.some(row => row.period);

  const columnDefinitions: ColumnDescription<ResponseRowFragment>[] = [
    GenericColumnKey.Selection,
    [
      getNameAndColorColumn(),
      { setter: ({ id, colour }) => onUpdate({ id, colour }) },
    ],
    {
      key: 'requisitionNumber',
      label: 'label.number',
      width: 100,
    },
    ['createdDatetime', { width: 150 }],
    [
      'status',
      {
        formatter: status =>
          getRequisitionTranslator(t)(status as RequisitionNodeStatus),
        width: 100,
      },
    ],
    {
      key: 'numberOfShipments',
      label: 'label.shipments',
      description: 'description.number-of-shipments',
      accessor: ({ rowData }) => rowData?.shipments?.totalCount ?? 0,
      sortable: false,
    },
    getCommentPopoverColumn(),
  ];

  if (program) {
    columnDefinitions.push(
      {
        key: 'programName',
        accessor: ({ rowData }) => rowData.programName,
        label: 'label.program',
        description: 'description.program',
        sortable: true,
      },
      {
        key: 'orderType',
        accessor: ({ rowData }) => rowData.orderType,
        label: 'label.order-type',
        sortable: true,
      },
      {
        key: 'period',
        accessor: ({ rowData }) => rowData.period?.name ?? '',
        label: 'label.period',
        sortable: true,
      }
    );
  }

  if (authoriseResponseRequisitions) {
    columnDefinitions.push({
      key: 'approvalStatus',
      label: 'label.auth-status',
      minWidth: 150,
      sortable: false,
      accessor: ({ rowData }) =>
        t(getApprovalStatusKey(rowData.approvalStatus)),
    });
  }

  const columns = useColumns<ResponseRowFragment>(
    columnDefinitions,
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons modalController={modalController} />

      <DataTable
        id="requisition-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        onRowClick={row => {
          navigate(String(row.id));
        }}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-requisitions')}
            onCreate={modalController.toggleOn}
          />
        }
      />
      <Footer />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <ResponseRequisitionListView />
    </TableProvider>
  );
};
