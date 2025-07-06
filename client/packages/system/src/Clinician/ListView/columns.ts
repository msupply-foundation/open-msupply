import {
  useColumns,
  ColumnDescription,
  useTranslation,
  getGenderTranslationKey,
} from '@openmsupply-client/common';
import { ClinicianFragment } from 'packages/programs/src';

export const useClinicianListColumns = () => {
  const t = useTranslation();
  const columnList: ColumnDescription<ClinicianFragment>[] = [
    {
      key: 'code',
      label: 'label.code',
    },
    {
      key: 'firstName',
      label: 'label.first-name',
    },
    {
      key: 'lastName',
      label: 'label.last-name',
    },
    {
      key: 'initials',
      label: 'label.initials',
    },
    {
      key: 'mobile',
      label: 'label.mobile',
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
