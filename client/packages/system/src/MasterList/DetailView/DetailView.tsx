import React, { FC, useEffect } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';
import { useMasterList } from '../api/hooks/useMasterList';

export const MasterListDetailView: FC = () => {
  const { data, isLoading } = useMasterList();
  const navigate = useNavigate();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.name ?? '' });
  }, [data, setCustomBreadcrumbs]);

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <>
      <Toolbar description={data.description} />
      <ContentArea />
    </>
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
