import {
  useColumns,
  ColumnDescription,
  GenderType,
} from '@openmsupply-client/common';

interface DummyClinicianRowFragment {
  id: string;
  code: string;
  initials: string;
  firstName?: string;
  lastName: string;
  gender?: GenderType;
}

export const useClinicianListColumns = () => {
  const columnList: ColumnDescription<DummyClinicianRowFragment>[] = [
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

  const columns = useColumns<DummyClinicianRowFragment>(columnList);

  return columns;
};
