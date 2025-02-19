import React from 'react';
import { usePatient } from '../api';
import { useInsuranceColumns } from './columns';
import {
  createQueryParamsStore,
  createTableStore,
  DataTable,
  TableProvider,
  useUrlQueryParams,
} from '@openmsupply-client/common';

export const InsuranceListView = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'asc' },
  });

  const columns = useInsuranceColumns({
    sortBy,
    onChangeSortBy: updateSortQuery,
  });

  const nameId = usePatient.utils.id();
  const { data, isLoading } = usePatient.document.insurances({
    nameId,
    sortBy,
  });

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <DataTable
        id="insurance-list"
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
      />
    </TableProvider>
  );
};
