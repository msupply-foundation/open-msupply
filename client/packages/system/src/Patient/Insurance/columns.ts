import {
  ColumnDef,
  ColumnType,
  useTranslation,
} from '@openmsupply-client/common';
import { InsuranceFragment } from '../apiModern/operations.generated';
import { useMemo } from 'react';

export const useInsuranceColumns = () => {
  const t = useTranslation();
  const columns = useMemo(
    (): ColumnDef<InsuranceFragment>[] => [
      {
        accessorKey: 'policyNumber',
        header: t('label.policy-number'),
      },
      {
        id: 'providerName',
        accessorFn: row => row.insuranceProviders?.providerName,
        header: t('label.provider-name'),
      },
      {
        id: 'policyType',
        accessorFn: row => t(`policyType.${row.policyType}`),
        header: t('label.policy-type'),
      },
      {
        accessorKey: 'discountPercentage',
        header: t('label.discount-rate'),
        columnType: ColumnType.Percentage,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        columnType: ColumnType.Date,
      },
      {
        id: 'isActive',
        accessorFn: row => row.isActive ? 'Active' : 'Inactive',
        header: t('label.status'),
      },
    ],
    []
  );

  return columns;
};
