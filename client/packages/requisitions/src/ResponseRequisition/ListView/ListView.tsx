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
import {
  useResponseRequisitions,
  ResponseRequisitionRowFragment,
} from '../api';

export const ResponseRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const { data, onChangeSortBy, sortBy, onChangePage, pagination, filter } =
    useResponseRequisitions();

  const columns = useColumns<ResponseRequisitionRowFragment>(
    [
      [getNameAndColorColumn(), { setter: () => {} }],
      {
        key: 'requisitionNumber',
        label: 'label.number',
      },
      'status',
      'comment',
      'selection',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar onDelete={() => {}} data={data?.nodes} filter={filter} />
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
