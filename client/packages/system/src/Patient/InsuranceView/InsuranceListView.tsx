import React from 'react';
import { usePatient } from '../api';
import { useInsuranceColumns } from './columns';
import {
  createQueryParamsStore,
  createTableStore,
  DataTable,
  TableProvider,
} from '@openmsupply-client/common';

export const InsuranceListView = () => {
  const columns = useInsuranceColumns();
  const patientId = usePatient.utils.id();
  const { data, isLoading } = usePatient.document.insurances(patientId);

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
