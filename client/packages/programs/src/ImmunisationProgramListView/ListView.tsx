import React, { FC, useMemo } from 'react';
import {
  useUrlQueryParams,
  useNavigate,
  NothingHere,
  useTranslation,
  UNDEFINED_STRING_VALUE,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
} from '@openmsupply-client/common';
import { useImmunisationProgramList } from '../api/hooks/useImmunisationProgramList';
import { ImmunisationProgramFragment } from '../api';

export const ImmunisationProgramListView: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();  
  const { queryParams } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const { data, isLoading, isError } = useImmunisationProgramList(queryParams);

  const columns = useMemo(
    (): ColumnDef<ImmunisationProgramFragment>[] => [
      {
        accessorKey: 'name',
        header: t('label.program-name'),
        size: 200,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'vaccine-courses',
        accessorFn: row =>
          row.vaccineCourses?.length === 0
            ? UNDEFINED_STRING_VALUE
            : row.vaccineCourses?.map(n => n.name).join(', '),
        header: t('label.vaccine-courses'),
        size: 600,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { table } = usePaginatedMaterialTable<ImmunisationProgramFragment>(
    {
      tableId: 'immunisation-list',
      isLoading,
      isError,
      columns,
      data: data?.nodes ?? [],
      enableRowSelection: false,
      onRowClick: row => navigate(row.id),
      totalCount: data?.totalCount ?? 0,
      noDataElement: <NothingHere body={t('error.no-immunisation-programs')} />,
    }
  );

  return <MaterialTable table={table} />;
};
