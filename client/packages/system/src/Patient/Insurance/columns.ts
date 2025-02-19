import {
  ColumnAlign,
  ColumnDescription,
  ColumnFormat,
  SortBy,
  useColumns,
  useTranslation,
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
  const t = useTranslation();
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
      accessor: ({ rowData }) => t(`policyType.${rowData.policyType}`),
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
      label: 'label.status',
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
