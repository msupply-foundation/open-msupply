import React, { FC } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  getNameAndColorColumn,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useUpdateResponse, useResponses, ResponseRowFragment } from '../api';

export const ResponseRequisitionListView: FC = () => {
  const { mutate: onUpdate } = useUpdateResponse();
  const navigate = useNavigate();
  const { data, onChangeSortBy, sortBy, onChangePage, pagination, filter } =
    useResponses();

  const columns = useColumns<ResponseRowFragment>(
    [
      [getNameAndColorColumn(), { setter: onUpdate }],
      {
        key: 'requisitionNumber',
        label: 'label.number',
      },
      'status',
      'comment',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        onRowClick={row => {
          navigate(String(row.requisitionNumber));
        }}
      />
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
