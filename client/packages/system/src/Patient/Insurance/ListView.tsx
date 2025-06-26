import React from 'react';
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

export const InsuranceListView = ({
  patientId,
  readOnly = false,
}: {
  readOnly?: boolean;
  patientId: string;
}) => {
  const t = useTranslation();
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
  } = useInsurancePolicies(patientId);

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
        onRowClick={
          readOnly
            ? undefined
            : row => {
                updateQuery({ insuranceId: row.id });
                setModal(PatientModal.Insurance);
              }
        }
        noDataElement={
          <NothingHere
            onCreate={
              readOnly ? undefined : () => selectModal(PatientModal.Insurance)
            }
            body={t('messages.no-insurance')}
            buttonText={t('button.add-insurance')}
          />
        }
      />
    </TableProvider>
  );
};
