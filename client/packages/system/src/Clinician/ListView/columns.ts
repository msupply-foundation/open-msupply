import {
  useColumns,
  ColumnDescription,
  useTranslation,
} from '@openmsupply-client/common';
import { ClinicianFragment } from 'packages/programs/src';
import { getGenderTranslationKey } from '../../Patient/PatientView';

export const useClinicianListColumns = () => {
  const t = useTranslation();
  const columnList: ColumnDescription<ClinicianFragment>[] = [
    {
      key: 'code',
      label: 'label.code',
      accessor: ({ rowData }) => rowData?.code,
    },
    {
      key: 'firstName',
      label: 'label.first-name',
      accessor: ({ rowData }) => rowData?.firstName,
    },
    {
      key: 'lastName',
      label: 'label.last-name',
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
      accessor: ({ rowData }) =>
        rowData.gender ? t(getGenderTranslationKey(rowData.gender)) : '',
    },
  ];

  const columns = useColumns<ClinicianFragment>(columnList);

  return columns;
};
