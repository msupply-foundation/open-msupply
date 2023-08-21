import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  useNavigate,
  createQueryParamsStore,
  ContactTraceSortFieldInput,
} from '@openmsupply-client/common';
import { useContactTraceListColumns } from './columns';
import {
  useContactTraces,
  ContactTraceRowFragment,
} from '@openmsupply-client/programs';

const ContactTraceListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { queryParams } = useUrlQueryParams({
    initialSort: {
      key: ContactTraceSortFieldInput.Datetime,
      dir: 'desc',
    },
  });
  const { data, isError, isLoading } = useContactTraces.document.list({
    sortBy: {
      key: queryParams.sortBy.key as ContactTraceSortFieldInput,
      isDesc: queryParams.sortBy.isDesc,
    },
  });
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const columns = useContactTraceListColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
    includePatient: true,
  });

  return (
    <DataTable
      id="contact-trace-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      onRowClick={({ id }) => navigate(String(id))}
      noDataElement={<NothingHere />}
    />
  );
};

export const ContactTraceListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<ContactTraceRowFragment>({
      initialSortBy: {
        key: ContactTraceSortFieldInput.Datetime,
        isDesc: true,
      },
    })}
  >
    <ContactTraceListComponent />
  </TableProvider>
);
