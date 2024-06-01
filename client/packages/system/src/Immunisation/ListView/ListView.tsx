import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  TableStore,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { UseBoundStore, StoreApi } from 'zustand';

const ImmunisationsListComponent: FC = () => {
  return (
    <>
      <Toolbar />
      <AppBarButtons />
      <DataTable columns={[]} id={''} />
    </>
  );
};

export const ImmunisationsListView: FC = () => (
  <TableProvider
    createStore={function (): UseBoundStore<StoreApi<TableStore>> {
      throw new Error('Function not implemented.');
    }}
  >
    <ImmunisationsListComponent />
  </TableProvider>
);
