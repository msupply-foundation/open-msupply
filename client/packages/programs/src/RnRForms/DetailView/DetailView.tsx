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
import { RnRForm, useRnRForm } from '../../api';
import { RnRFormLineFragment } from '../../api/operations.generated';

export const RnRFormDetailView = () => {
  const { id = '' } = useParams();

  const {
    query: { data, isLoading },
    updateLine: { updateLine },
  } = useRnRForm({ rnrFormId: id });
  const navigate = useNavigate();
  const t = useTranslation('programs');

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <RnRFormDetailViewComponent data={data} saveLine={updateLine} />
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

const RnRFormDetailViewComponent = ({
  data,
  saveLine,
}: {
  data: RnRForm;
  saveLine: (line: RnRFormLineFragment) => Promise<void>;
}) => {
  const t = useTranslation('programs');
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const tabs = [
    {
      Component: (
        <ContentArea
          periodLength={data.periodLength}
          data={data.lines}
          saveLine={saveLine}
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

      <Footer rnrFormId={data.id} />
    </>
  );
};
