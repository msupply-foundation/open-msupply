import {
  ColumnAlign,
  ColumnDescription,
  ColumnFormat,
  useColumns,
} from '@openmsupply-client/common';
import { InsuranceFragment } from '../api/operations.generated';

type Status = 'Active' | 'Inactive';

export const useInsuranceColumns = () => {
  const columns: ColumnDescription<InsuranceFragment>[] = [
    {
      label: 'label.policy-number',
      key: 'policyNumber',
    },
    {
      label: 'label.provider-name',
      key: 'providerName',
      accessor: ({ rowData }) => rowData.insuranceProviders?.providerName,
    },
    {
      label: 'label.policy-type',
      key: 'policyType',
    },
    {
      label: 'label.discount-rate',
      key: 'discountRate',
      accessor: ({ rowData }) => rowData.discountPercentage,
    },
    {
      label: 'label.expiry-date',
      key: 'expiryDate',
      format: ColumnFormat.Date,
      align: ColumnAlign.Left,
    },
    {
      label: 'label.is-active',
      key: 'isActive',
      accessor: ({ rowData }): Status => {
        const { isActive } = rowData;
        return isActive ? 'Active' : 'Inactive';
      },
    },
  ];

  return useColumns(columns, {}, []);
};
