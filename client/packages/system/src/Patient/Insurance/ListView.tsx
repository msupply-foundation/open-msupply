import React from 'react';
import { usePatient } from '../api';
import { useInsuranceColumns } from './columns';
import {
  createQueryParamsStore,
  createTableStore,
  DataTable,
  NothingHere,
  TableProvider,
  useUrlQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';

import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { useInsurances } from '../apiModern/hooks/useInsurances';

export const InsuranceListView = () => {
  const nameId = usePatient.utils.id();
  const { updateQuery } = useUrlQuery();
  const { setModal } = usePatientModalStore();

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

  const {
    query: { data, isLoading },
  } = useInsurances(nameId);

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
        data={data}
        isLoading={isLoading}
        onRowClick={row => {
          updateQuery({ insuranceId: row.id });
          setModal(PatientModal.Insurance);
        }}
        noDataElement={<NothingHere />}
      />
    </TableProvider>
  );
};
