import React, { useEffect } from 'react';
import {
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  DetailTabs,
  useBreadcrumbs,
  useParams,
  TableProvider,
  createTableStore,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { ContentArea } from './ContentArea';
import { useRnRForm } from '../../api';

export const RnRFormDetailView = () => {
  const { id = '' } = useParams();

  const { data, isLoading } = useRnRForm({ rnrFormId: id });
  const navigate = useNavigate();
  const t = useTranslation('programs');
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const tabs = [
    {
      Component: <ContentArea data={data?.lines ?? []} />,
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.periodName ?? '' });
  }, [setCustomBreadcrumbs, data]);

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <>
      <AppBarButtons />
      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
      </TableProvider>

      <Footer />
    </>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Programs)
            .addPart(AppRoute.RnRForms)
            .build()
        )
      }
      title={t('error.rnr-not-found')}
      message={t('messages.click-to-return-to-rnr-list')}
    />
  );
};
