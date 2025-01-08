import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  createQueryParamsStore,
  useParams,
  InlineSpinner,
  AppFooterPortal,
  Box,
  ButtonWithIcon,
  CloseIcon,
  useTranslation,
  useUrlQueryParams,
  DataTable,
  useColumns,
  NothingHere,
  useEditModal,
  UNDEFINED_STRING_VALUE,
  GenericColumnKey,
  ActionsFooter,
  Action,
  DeleteIcon,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import {
  VaccineCourseFragment,
  useVaccineCourseList,
  useImmunisationProgram,
} from '../api';
import { VaccineCourseEditModal } from '../VaccineCourseEditModal';
import { useDeleteSelectedVaccineCourses } from '../api';

export const ProgramComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const t = useTranslation();
  const { setCustomBreadcrumbs, navigateUpOne } = useBreadcrumbs();
  const { id } = useParams();
  const {
    query: { data, isLoading },
  } = useImmunisationProgram(id);
  const { selectedRows, confirmAndDelete } = useDeleteSelectedVaccineCourses();

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

  const columns = useColumns<VaccineCourseFragment>(
    [
      GenericColumnKey.Selection,
      { key: 'name', label: 'label.name' },
      {
        key: 'demographicIndicator',
        label: 'label.target-demographic',

        sortable: false,
        accessor: ({ rowData }) =>
          rowData?.demographic
            ? rowData.demographic.name
            : UNDEFINED_STRING_VALUE,
      },
      {
        key: 'doses',
        label: 'label.doses',
        accessor: ({ rowData }) => rowData?.vaccineCourseDoses?.length ?? 0,
      },
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

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
      <Toolbar />
      <AppBarButtons onCreate={onOpen} />
      <DataTable
        id={'Vaccine Course List'}
        pagination={{ ...pagination }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={vaccineCoursesData?.nodes ?? []}
        isLoading={vaccineCoursesLoading}
        isError={vaccineCoursesError}
        onRowClick={onOpen}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
      <AppFooterPortal
        Content={
          <>
            {selectedRows.length !== 0 && (
              <ActionsFooter
                actions={actions}
                selectedRowCount={selectedRows.length}
              />
            )}
            {data && selectedRows.length == 0 && (
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
            )}
          </>
        }
      />
    </>
  );
};

export const ImmunisationProgramDetailView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ProgramComponent />
  </TableProvider>
);
