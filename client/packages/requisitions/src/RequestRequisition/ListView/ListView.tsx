import React, { FC, useCallback } from 'react';
import {
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  getNameAndColorColumn,
  useNavigate,
  BasicSpinner,
  useTranslation,
  RequisitionNodeStatus,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import {
  RequestRequisitionRowFragment,
  useUpdateRequestRequisition,
  useRequestRequisitions,
} from '../api';
import { getRequisitionTranslator } from '../../utils';

export const RequestRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation('replenishment');

  const { mutate: onUpdate } = useUpdateRequestRequisition();

  const {
    data,
    isLoading,
    sortBy,
    onChangeSortBy,
    filter,
    pagination,
    onChangePage,
  } = useRequestRequisitions();
  const columns = useColumns<RequestRequisitionRowFragment>(
    [
      [getNameAndColorColumn(), { setter: onUpdate }],
      {
        key: 'requisitionNumber',
        label: 'label.number',
      },
      [
        'status',
        {
          formatter: currentStatus =>
            getRequisitionTranslator(t)(currentStatus as RequisitionNodeStatus),
        },
      ],
      'comment',
      'selection',
    ],
    { sortBy, onChangeSortBy },
    [sortBy, onChangeSortBy]
  );

  const onRowClick = useCallback(
    (row: RequestRequisitionRowFragment) => {
      navigate(String(row.requisitionNumber));
    },
    [navigate]
  );

  if (isLoading) {
    return <BasicSpinner />;
  }

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        onRowClick={onRowClick}
      />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <RequestRequisitionListView />
    </TableProvider>
  );
};
