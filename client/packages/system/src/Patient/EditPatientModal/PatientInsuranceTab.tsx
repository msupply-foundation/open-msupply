import React from 'react';
import { usePatient } from '../api';
import {
  createQueryParamsStore,
  createTableStore,
  DataTable,
  NothingHere,
  TableProvider,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';

import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { useInsurancePolicies } from '../apiModern/hooks/useInsurancesPolicies';
import { useInsuranceColumns } from '../Insurance/columns';

export const PatientInsuranceTab = () => {
  const t = useTranslation();
  const nameId = usePatient.utils.id();
  const { setModal: selectModal } = usePatientModalStore();

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
  } = useInsurancePolicies(nameId);

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
        noDataElement={
          <NothingHere
            onCreate={() => selectModal(PatientModal.Insurance)}
            body={t('messages.no-insurance')}
            buttonText={' '}
          />
        }
      />
    </TableProvider>
  );
};
