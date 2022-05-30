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
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { RequestRowFragment, useRequest } from '../api';
import { getRequisitionTranslator, isRequestDisabled } from '../../utils';

const useDisableRequestRows = (rows?: RequestRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isRequestDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const RequestRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation('replenishment');
  const modalController = useToggle();

  const { mutate: onUpdate } = useRequest.document.update();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filterKey: 'otherPartyName' });
  const { data, isError, isLoading } = useRequest.document.list();
  const pagination = { page, first, offset };
  useDisableRequestRows(data?.nodes);

  const columns = useColumns<RequestRowFragment>(
    [
      [getNameAndColorColumn(), { setter: onUpdate }],
      {
        key: 'requisitionNumber',
        label: 'label.number',
        width: 100,
      },
      'createdDatetime',
      [
        'status',
        {
          formatter: currentStatus =>
            getRequisitionTranslator(t)(currentStatus as RequisitionNodeStatus),
        },
      ],
      ['comment', { width: '100%' }],
      'selection',
    ],
    { sortBy, onChangeSortBy: updateSortQuery },
    [sortBy, updateSortQuery]
  );

  const onRowClick = useCallback(
    (row: RequestRowFragment) => {
      navigate(String(row.requisitionNumber));
    },
    [navigate]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} modalController={modalController} />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        onRowClick={onRowClick}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-internal-orders')}
            onCreate={modalController.toggleOn}
          />
        }
      />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <RequestRequisitionListView />
  </TableProvider>
);
