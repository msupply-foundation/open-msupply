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
  RnRFormNodeStatus,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { ContentArea } from './ContentArea';
import { RnRFormQuery, useRnRForm } from '../api';
import { SidePanel } from './SidePanel';

export const RnRFormDetailView = () => {
  const { id = '' } = useParams();

  const {
    query: { data, isLoading },
  } = useRnRForm({ rnrFormId: id });
  const navigate = useNavigate();
  const t = useTranslation();

  console.log(isLoading);
  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <RnRFormDetailViewComponent data={data} />
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.RnRForms)
            .build()
        )
      }
      title={t('error.rnr-not-found')}
      message={t('messages.click-to-return-to-rnr-list')}
    />
  );
};

const RnRFormDetailViewComponent = ({ data }: { data: RnRFormQuery }) => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const tabs = [
    {
      Component: (
        <ContentArea
          rnrFormId={data.id}
          periodLength={data.periodLength}
          data={data.lines}
          disabled={data.status === RnRFormNodeStatus.Finalised}
        />
      ),
      value: t('label.details'),
    },
    {
      Component: <ActivityLogList recordId={data.id} />,
      value: t('label.log'),
    },
  ];

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data.periodName });
  }, [setCustomBreadcrumbs, data.periodName]);

  return (
    <>
      <AppBarButtons />
      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
      </TableProvider>

      <SidePanel rnrFormId={data.id} />
      <Footer data={data} />
    </>
  );
};
