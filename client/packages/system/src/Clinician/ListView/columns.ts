import {
  useColumns,
  ColumnDescription,
  // GenderType,
} from '@openmsupply-client/common';
import { ClinicianFragment } from 'packages/programs/src';

export const useClinicianListColumns = () => {
  const columnList: ColumnDescription<ClinicianFragment>[] = [
    {
      key: 'code',
      label: 'label.code',
      accessor: ({ rowData }) => rowData?.code,
    },
    {
      key: 'firstName',
      label: 'label.firstName',
      accessor: ({ rowData }) => rowData?.firstName,
    },
    {
      key: 'lastName',
      label: 'label.lastName',
      accessor: ({ rowData }) => rowData?.lastName,
    },
    {
      key: 'initials',
      label: 'label.initials',
      accessor: ({ rowData }) => rowData?.initials,
    },
    {
      key: 'gender',
      label: 'label.gender',
      accessor: ({ rowData }) => rowData?.gender,
    },
  ];

  const columns = useColumns<ClinicianFragment>(columnList);

  return columns;
};
