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
import { useMasterList } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';

export const MasterListDetailView: FC = () => {
  const { data, isLoading } = useMasterList.document.get();
  const navigate = useNavigate();
  const t = useTranslation('catalogue');

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons />
      <Toolbar />
      <ContentArea />
      <SidePanel />
    </TableProvider>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.MasterLists)
            .build()
        )
      }
      title={t('error.master-list-not-found')}
      message={t('messages.click-to-return-to-master-lists')}
    />
  );
};
