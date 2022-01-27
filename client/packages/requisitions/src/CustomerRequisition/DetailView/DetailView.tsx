import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import {
  useIsCustomerRequisitionDisabled,
  useCustomerRequisition,
} from '../api';

export const DetailView: FC = () => {
  const { data } = useCustomerRequisition();
  const isDisabled = useIsCustomerRequisitionDisabled();

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons isDisabled={isDisabled} onAddItem={() => {}} />
      <Toolbar />
      <ContentArea />
      <Footer />
      <SidePanel />
    </TableProvider>
  ) : (
    <DetailViewSkeleton />
  );
};
