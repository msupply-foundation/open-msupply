import React from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useTranslation,
  // useUrlQueryParams,
} from '@openmsupply-client/common';
import { useClinicianListColumns } from './columns';
import { ClinicianFragment, useClinicians } from 'packages/programs/src';

const ClinicianListComponent = () => {
  // const {
  // updatePaginationQuery,
  // queryParams: { page, first, offset },
  // } = useUrlQueryParams();
  // const { data, isError, isLoading } = useClinicians();
  // {
  // pagination: { first, offset },
  // }
  const { data } = useClinicians.document.list({});
  const clinicians: ClinicianFragment[] = data?.nodes ?? [];
  const columns = useClinicianListColumns();

  const t = useTranslation();

  return (
    <DataTable
      id="clinician-list"
      // pagination={{ page, first, offset, total: data?.totalCount }}
      // onChangePage={updatePaginationQuery}
      columns={columns}
      data={clinicians}
      // isError={isError}
      isLoading={false}
      // isLoading={isLoading}
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
