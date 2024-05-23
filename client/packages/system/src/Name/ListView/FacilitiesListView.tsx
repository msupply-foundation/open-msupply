import React from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  DotCell,
  ColumnAlign,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../api';
import { NameRenderer } from '../Components';

const FacilitiesListComponent = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useName.document.facilities();
  const pagination = { page, first, offset };

  const columns = useColumns<NameRowFragment>(
    [
      {
        key: 'code',
        label: 'label.code',
        Cell: ({ rowData }) => (
          <NameRenderer label={rowData.code} isStore={!!rowData.store} />
        ),
        width: 100,
      },
      'name',
      {
        key: 'isSupplier',
        label: 'label.supplier',
        align: ColumnAlign.Center,
        Cell: DotCell,
        width: 75,
        sortable: false,
      },
      {
        key: 'isCustomer',
        label: 'label.customer',
        align: ColumnAlign.Center,
        Cell: DotCell,
        width: 75,
        sortable: false,
      },
      {
        key: 'isDonor',
        label: 'label.donor',
        align: ColumnAlign.Center,
        Cell: DotCell,
        width: 75,
        sortable: false,
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <DataTable
        id="name-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        noDataElement={<NothingHere />}
      />
    </>
  );
};

export const FacilitiesListView = () => (
  <TableProvider createStore={createTableStore}>
    <FacilitiesListComponent />
  </TableProvider>
);
