import React from 'react';
import { useInsuranceColumns } from './columns';
import {
  MaterialTable,
  NothingHere,
  useNonPaginatedMaterialTable,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';

import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { useInsurancePolicies } from '../apiModern/hooks/useInsurancesPolicies';
import { InsuranceFragment } from '../apiModern/operations.generated';

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

  const columns = useInsuranceColumns();

  const {
    query: { data, isLoading },
  } = useInsurancePolicies(patientId);

  const { table } = useNonPaginatedMaterialTable<InsuranceFragment>({
    tableId: 'patient-insurance-list',
    columns,
    data,
    isLoading,
    onRowClick: row => {
      if (readOnly)
        return undefined
      updateQuery({ insuranceId: row.id });
      setModal(PatientModal.Insurance);
    },
    enableRowSelection: false,
    noDataElement: <NothingHere
      onCreate={readOnly ? undefined : () => selectModal(PatientModal.Insurance)}
      body={t('messages.no-insurance')}
      buttonText={t('button.add-insurance')}
    />,
  });

  return <MaterialTable table={table} />;
};
