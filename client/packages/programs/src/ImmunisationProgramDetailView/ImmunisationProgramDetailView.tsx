import React, { FC, useEffect, useMemo } from 'react';
import {
  useBreadcrumbs,
  useParams,
  InlineSpinner,
  AppFooterPortal,
  Box,
  ButtonWithIcon,
  CloseIcon,
  useTranslation,
  useUrlQueryParams,
  NothingHere,
  useEditModal,
  ActionsFooter,
  Action,
  DeleteIcon,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import {
  VaccineCourseFragment,
  useVaccineCourseList,
  useImmunisationProgram,
} from '../api';
import { VaccineCourseEditModal } from '../VaccineCourseEditModal';
import { useDeleteSelectedVaccineCourses } from '../api';

export const ImmunisationProgramDetailView: FC = () => {
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const t = useTranslation();
  const { setCustomBreadcrumbs, navigateUpOne } = useBreadcrumbs();
  const { id } = useParams();
  const {
    query: { data, isLoading },
  } = useImmunisationProgram(id);

  const queryParams = {
    filterBy: { ...filterBy, programId: { equalTo: id } },
    offset,
    sortBy,
    first,
  };

  const {
    data: vaccineCoursesData,
    isLoading: vaccineCoursesLoading,
    isError: vaccineCoursesError,
  } = useVaccineCourseList(queryParams);

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.name ?? '' });
  }, [setCustomBreadcrumbs, data]);

  const {
    isOpen,
    onClose,
    onOpen,
    entity: vaccineCourse,
    mode,
  } = useEditModal<VaccineCourseFragment>();

  const columns = useMemo(
    (): ColumnDef<VaccineCourseFragment>[] => [
      {
        accessorKey: 'name',
        header: t('label.name'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'demographic.name',
        header: t('label.target-demographic'),
      },
      {
        accessorKey: 'vaccineCourseDoses.length',
        header: t('label.doses'),
      },
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable<VaccineCourseFragment>({
    tableId: 'vaccine-course-list',
    isLoading: vaccineCoursesLoading,
    isError: vaccineCoursesError,
    columns,
    data: vaccineCoursesData?.nodes ?? [],
    enableRowSelection: true,
    onRowClick: onOpen,
    totalCount: vaccineCoursesData?.totalCount ?? 0,
    noDataElement: (
      <NothingHere
        body={t('error.no-vaccine-courses')}
        onCreate={onOpen}
      />
    ),
  });

  const { confirmAndDelete } = useDeleteSelectedVaccineCourses({ selectedRows, resetRowSelection: table.resetRowSelection });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  return isLoading ? (
    <InlineSpinner />
  ) : (
    <>
      {isOpen && (
        <VaccineCourseEditModal
          isOpen={isOpen}
          onClose={onClose}
          programId={id}
          vaccineCourse={vaccineCourse}
          mode={mode}
        />
      )}
      <AppBarButtons onCreate={onOpen} />
      <MaterialTable table={table} />
      <AppFooterPortal
        Content={
          selectedRows.length ? (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={table.resetRowSelection}
            />
          ) : (
            <Box
              flex={1}
              display="flex"
              flexDirection="row"
              justifyContent="flex-end"
              alignItems="center"
              gap={2}
              height={64}
            >
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<CloseIcon />}
                label={t('button.close')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={navigateUpOne}
              />
            </Box>
          )
        }
      />
    </>
  );
};
