import {
  useTranslation,
  getGenderTranslationKey,
  ColumnDef,
} from '@openmsupply-client/common';
import { ClinicianFragment } from 'packages/programs/src';
import { useMemo } from 'react';

export const useClinicianListColumns = () => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<ClinicianFragment>[] => [
      { accessorKey: 'code', header: t('label.code'), enableSorting: true },
      {
        accessorKey: 'firstName',
        header: t('label.first-name'),
        enableSorting: true,
      },
      {
        accessorKey: 'lastName',
        header: t('label.last-name'),
        enableSorting: true,
      },
      {
        accessorKey: 'initials',
        header: t('label.initials'),
        enableSorting: true,
      },
      { accessorKey: 'mobile', header: t('label.mobile') },
      {
        id: 'gender',
        header: t('label.gender'),
        accessorFn: ({ gender }) =>
          gender ? t(getGenderTranslationKey(gender)) : '',
      },
    ],
    []
  );

  return columns;
};
