import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  NothingHere,
  createQueryParamsStore,
  DataTable,
  useNavigate,
  useTranslation,
  useUrlQueryParams,
  useColumns,
  useEditModal,
  useParams,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { VaccineCreateModal } from './VaccineCreateModal';
import { useImmunisationProgram } from '../api/hooks/useImmunisationProgram';
import { useVaccineCourseList } from '../api/hooks/useVaccineCourseList';

export interface VaccineCourse {
  id: string;
  name: string;
}

export const ImmunisationProgramComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const { setSuffix } = useBreadcrumbs();
  const { id } = useParams();
  const {
    query: { data },
    draft,
    updatePatch,
    isDirty,
    // update: { update, isUpdating },
  } = useImmunisationProgram(id);

  const queryParams = {
    filterBy,
    offset,
    sortBy,
    first,
  };

  const {
    data: coursesData,
    isLoading,
    isError,
  } = useVaccineCourseList(queryParams);

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
  }, [setSuffix]);

  // create modal will generate vaccine for program. Onclick will navigate for detailed edit
  const { isOpen, onClose, onOpen } = useEditModal<any>();

  return !!data ? (
    <>
      {isOpen && <VaccineCreateModal isOpen={isOpen} onClose={onClose} />}
      <Toolbar draft={draft} onUpdate={updatePatch} isDirty={isDirty} />
      <AppBarButtons onCreate={onOpen} />
      <DataTable
        id={'Program list'}
        pagination={{ ...pagination }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={coursesData?.nodes as VaccineCourse[]}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => navigate(row.id)}
        noDataElement={<NothingHere body={t('error.no-master-lists')} />}
      />
    </>
  ) : (
    <NothingHere />
  );
};

export const ImmunisationProgramView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ImmunisationProgramComponent></ImmunisationProgramComponent>
  </TableProvider>
);
