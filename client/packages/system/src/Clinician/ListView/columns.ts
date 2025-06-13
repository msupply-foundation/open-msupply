import {
  useColumns,
  ColumnDescription,
  useTranslation,
} from '@openmsupply-client/common';
import { ClinicianFragment } from 'packages/programs/src';
import { getGenderTranslationKey } from '../..';

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
      key: 'gender',
      label: 'label.gender',
      accessor: ({ rowData }) =>
        rowData.gender ? t(getGenderTranslationKey(rowData.gender)) : '',
    },
  ];

  const columns = useColumns<ClinicianFragment>(columnList);

  return columns;
};
