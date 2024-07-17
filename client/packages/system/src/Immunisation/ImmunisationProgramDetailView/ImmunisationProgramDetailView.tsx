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
  LoadingButton,
  SaveIcon,
  useTranslation,
  useUrlQueryParams,
  DataTable,
  useColumns,
  NothingHere,
  useEditModal,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { useImmunisationProgram } from '../api/hooks/useImmunisationProgram';
import { AppBarButtons } from './AppBarButtons';
import { useVaccineCourseList } from '../api/hooks/useVaccineCourseList';
import { VaccineCourseFragment } from '../api';
import { VaccineCourseEditModal } from '../VaccineCourseEditModal';

export const ProgramComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const t = useTranslation('catalogue');
  const { setCustomBreadcrumbs, navigateUpOne } = useBreadcrumbs();
  const { id } = useParams();
  const {
    query: { data, isLoading },
    draft,
    errorMessage,
    updatePatch,
    isDirty,
    update: { update, isUpdating },
  } = useImmunisationProgram(t, id);

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
      { key: 'name', label: 'label.name' },
      {
        key: 'demographicIndicator',
        label: 'label.target-demographic',

        sortable: false,
        accessor: ({ rowData }) =>
          rowData?.demographicIndicator
            ? rowData.demographicIndicator.name
            : UNDEFINED_STRING_VALUE,
      },
      { key: 'doses', label: 'label.doses' },
      'selection',
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
      <Toolbar
        draft={draft}
        onUpdate={updatePatch}
        error={errorMessage}
        isError={errorMessage != ''}
      />
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
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<CloseIcon />}
                label={t('button.close')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={navigateUpOne}
              />

              <LoadingButton
                disabled={!isDirty || isUpdating}
                isLoading={isUpdating}
                onClick={() => {
                  update();
                }}
                startIcon={<SaveIcon />}
                sx={{ fontSize: '12px' }}
              >
                {t('button.save')}
              </LoadingButton>
            </Box>
          </Box>
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
