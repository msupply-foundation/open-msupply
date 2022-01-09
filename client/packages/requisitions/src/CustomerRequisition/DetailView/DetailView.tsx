import React, { FC } from 'react';
import { TableProvider, createTableStore } from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { useIsCustomerRequisitionDisabled } from '../api';

export const DetailView: FC = () => {
  const isDisabled = useIsCustomerRequisitionDisabled();

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons isDisabled={isDisabled} onAddItem={() => {}} />
      <Toolbar />
      <ContentArea />
      <Footer />
      <SidePanel />
    </TableProvider>
  );
};
