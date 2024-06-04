import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  NothingHere,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';

// dummy data
const data = {
  name: 'data',
};

export const ProgramComponent: FC = () => {
  const { setSuffix } = useBreadcrumbs();

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [setSuffix]);

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <Toolbar />
    </TableProvider>
  ) : (
    <NothingHere />
  );
};

export const ProgramView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ProgramComponent></ProgramComponent>
  </TableProvider>
);
