import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { useRequestRequisition, useIsRequestRequisitionDisabled } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';

export const DetailView: FC = () => {
  const { data, isLoading } = useRequestRequisition();
  const isDisabled = useIsRequestRequisitionDisabled();
  const navigate = useNavigate();
  const t = useTranslation('replenishment');

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons isDisabled={!data || !isDisabled} onAddItem={() => {}} />
      <Toolbar />
      <ContentArea />
      <Footer />
      <SidePanel />
    </TableProvider>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.SupplierRequisition)
            .build()
        )
      }
      title={t('error.requisition-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
