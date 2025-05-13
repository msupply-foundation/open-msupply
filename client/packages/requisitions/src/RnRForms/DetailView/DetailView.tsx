import React, { useEffect, useState } from 'react';
import {
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  DetailTabs,
  useBreadcrumbs,
  useParams,
  RnRFormNodeStatus,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { ContentArea } from './ContentArea';
import {
  useOneTime,
  RnRFormQuery,
  useRnRForm,
  useRnRFormContext,
} from '../api';
import { SidePanel } from './SidePanel';
import { AutoSave } from './AutoSave';

export const RnRFormDetailView = () => {
  const { id = '' } = useParams();
  const [isInitialising, setIsInitialising] = useState(true);

  const setInitial = useRnRFormContext(useOneTime(state => state.setInitial));

  const {
    query: { data, isLoading },
  } = useRnRForm({ rnrFormId: id });
  const navigate = useNavigate();
  const t = useTranslation();

  useEffect(() => {
    if (!!data && isInitialising) {
      setInitial(data.id, data.lines);
      setIsInitialising(false);
    }
  }, [isInitialising, data]);

  if (isLoading || isInitialising) return <DetailViewSkeleton />;

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
      <AutoSave />
      <DetailTabs tabs={tabs} />

      <SidePanel rnrFormId={data.id} />
      <Footer data={data} />
    </>
  );
};
