import {
  ColumnAlign,
  ColumnDescription,
  ColumnFormat,
  SortBy,
  useColumns,
} from '@openmsupply-client/common';
import { InsuranceFragment } from '../api/operations.generated';

type Status = 'Active' | 'Inactive';

interface InsuranceColumns {
  sortBy: SortBy<unknown>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

export const useInsuranceColumns = ({
  sortBy,
  onChangeSortBy,
}: InsuranceColumns) => {
  const columns: ColumnDescription<InsuranceFragment>[] = [
    {
      label: 'label.policy-number',
      key: 'policyNumber',
      sortable: false,
    },
    {
      label: 'label.provider-name',
      key: 'providerName',
      accessor: ({ rowData }) => rowData.insuranceProviders?.providerName,
      sortable: false,
    },
    {
      label: 'label.policy-type',
      key: 'policyType',
      accessor: ({ rowData }) =>
        rowData.policyType.charAt(0).toUpperCase() +
        rowData.policyType.slice(1).toLowerCase(),
      sortable: false,
    },
    {
      label: 'label.discount-rate',
      key: 'discountRate',
      accessor: ({ rowData }) => rowData.discountPercentage,
      sortable: false,
    },
    {
      label: 'label.expiry-date',
      key: 'expiryDate',
      format: ColumnFormat.Date,
      align: ColumnAlign.Left,
      accessor: ({ rowData }) => rowData.expiryDate,
      sortable: true,
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

  return useColumns(columns, { sortBy, onChangeSortBy }, [
    sortBy,
    onChangeSortBy,
  ]);
};
