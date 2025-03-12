import React from 'react';
import { usePatient } from '../api';
import { useInsuranceColumns } from './columns';
import {
  createQueryParamsStore,
  createTableStore,
  DataTable,
  NothingHere,
  TableProvider,
  useTranslation,
  useUrlQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';

import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { useInsurancePolicies } from '../apiModern/hooks/useInsurancesPolicies';

export const InsuranceListView = () => {
  const t = useTranslation();
  const nameId = usePatient.utils.id();
  const { updateQuery } = useUrlQuery();
  const { setModal } = usePatientModalStore();
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
        onRowClick={row => {
          updateQuery({ insuranceId: row.id });
          setModal(PatientModal.Insurance);
        }}
        noDataElement={
          <NothingHere
            onCreate={() => selectModal(PatientModal.Insurance)}
            body={t('messages.no-insurance')}
            buttonText={t('button.add-insurance')}
          />
        }
      />
    </TableProvider>
  );
};
