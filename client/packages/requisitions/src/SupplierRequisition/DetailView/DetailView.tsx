import React, { FC } from 'react';
import { TableProvider, createTableStore } from '@openmsupply-client/common';
import { useSupplierRequisition } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { isRequisitionEditable } from '../../utils';
import { ContentArea } from './ContentArea';

export const DetailView: FC = () => {
  const { data } = useSupplierRequisition();

  if (!data) return null;

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isRequisitionEditable(data)}
        onAddItem={() => {}}
      />
      <Toolbar />
      <ContentArea />
      <Footer />
      <SidePanel />
    </TableProvider>
  );
};
