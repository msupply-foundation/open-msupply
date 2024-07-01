import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { useMasterList } from '../api';
import { Toolbar } from './Toolbar';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';

export const MasterListDetailView: FC = () => {
  const { data, isLoading } = useMasterList.document.get();
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const { setBreadcrumbRenderers } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbRenderers({ 1: () => data?.name ?? '' });
  }, [data, setBreadcrumbRenderers]);

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <Toolbar />
      <ContentArea />
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
