import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { useResponseRequisition } from '../api';
import { AppRoute } from '@openmsupply-client/config';

export const DetailView: FC = () => {
  const { data, isLoading } = useResponseRequisition();
  const navigate = useNavigate();
  const t = useTranslation('distribution');

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={() => {}} />
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
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerRequisition)
            .build()
        )
      }
      title={t('error.requisition-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
