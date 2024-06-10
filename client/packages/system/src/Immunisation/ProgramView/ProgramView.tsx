import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  createQueryParamsStore,
  useParams,
  Typography,
  InlineSpinner,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { useImmunisationProgram } from '../api/hooks/useImmunisationProgram';

export const ProgramComponent: FC = () => {
  const { setSuffix } = useBreadcrumbs();
  const { id } = useParams();
  const {
    query: { data, isLoading },
    draft,
    updatePatch,
    isDirty,
    // update: { update, isUpdating },
  } = useImmunisationProgram(id);

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [setSuffix, data]);

  return isLoading ? (
    <InlineSpinner />
  ) : (
    <>
      <Toolbar draft={draft} onUpdate={updatePatch} isDirty={isDirty} />
      <Typography variant="body2">Vaccine Course List - Coming soon</Typography>
    </>
  );
};

export const ProgramView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ProgramComponent />
  </TableProvider>
);
