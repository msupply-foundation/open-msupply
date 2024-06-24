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
  useUrlQuery,
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
  const { urlQuery, updateQuery } = useUrlQuery();
  const pagination = { page, first, offset };
  const t = useTranslation('catalogue');
  const { setSuffix, navigateUpOne } = useBreadcrumbs();
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
        accessor: ({ rowData }) => {
          if (!rowData?.demographicIndicator) {
            return '-';
          }
          return rowData.demographicIndicator.name;
        },
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
    setSuffix(data?.name ?? '');
  }, [setSuffix, data]);

  const {
    isOpen,
    onClose,
    onOpen,
    entity: vaccineCourse,
    mode,
  } = useEditModal<VaccineCourseFragment>();

  // this will open the edit modal, if the `edit` query parameter is set
  // to a valid sensor ID. On opening, the query param is removed to
  // prevent a loop which would happen if a sensor was edited
  useEffect(() => {
    const vaccineCourseId = (urlQuery['edit'] as string) ?? '';
    if (vaccineCourseId) {
      // keep this check so we don't go to edit mode if incorrect id prompt
      const vaccineCourse = vaccineCoursesData?.nodes?.find(
        c => c.id === vaccineCourseId
      );
      if (vaccineCourse) {
        updateQuery({ edit: '' });
        onOpen(vaccineCourse);
      }
    }
  }, [vaccineCoursesData?.nodes]);

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
