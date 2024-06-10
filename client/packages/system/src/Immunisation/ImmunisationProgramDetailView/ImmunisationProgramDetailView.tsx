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
  useNavigate,
  useColumns,
  NothingHere,
  useEditModal,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { useImmunisationProgram } from '../api/hooks/useImmunisationProgram';
import { AppBarButtons } from './AppBarButtons';
import { VaccineCourseCreateModal } from './VaccineCourseCreateModal';

export const ProgramComponent: FC = () => {
  const navigate = useNavigate();
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
  } = useImmunisationProgram(id);

  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };

  const columns = useColumns(
    [
      'name',
      { key: 'targetDemographic', label: 'label.target-demographic' },
      { key: 'doses', label: 'label.doses' },
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

  const { isOpen, onClose, onOpen } = useEditModal<any>();

  return isLoading ? (
    <InlineSpinner />
  ) : (
    <>
      {isOpen && <VaccineCourseCreateModal isOpen={isOpen} onClose={onClose} />}
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
        data={[]} // TODO Query for Vaccine Courses
        isLoading={false} // TODO Query for Vaccine Courses
        onRowClick={row => navigate(row.id)}
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
