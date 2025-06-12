import React from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useClinicianListColumns } from './columns';

const ClinicianListComponent = () => {
  const {
    updatePaginationQuery,
    queryParams: { page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useClinician({
    pagination: { first, offset },
  });
  const columns = useClinicianListColumns();

  const t = useTranslation();

  return (
    <DataTable
      id="clinician-list"
      pagination={{ page, first, offset, total: data?.totalCount }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={data}
      isError={isError}
      isLoading={isLoading}
      noDataElement={<NothingHere body={t('error.no-clinicians')} />}
    />
  );
};

export const ClinicianListView = () => (
  <>
    <TableProvider createStore={createTableStore}>
      <ClinicianListComponent />
    </TableProvider>
  </>
);
