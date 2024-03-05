import React, { FC, useEffect } from 'react';
import {
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  DetailFormSkeleton,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { Summary } from './Tabs';
import { useAssets } from '../api';
import { Details } from './Tabs/Details';
import { StatusLogs } from './Tabs/StatusLogs';
import { Documents } from './Tabs/Documents';

export const EquipmentDetailView: FC = () => {
  const { data, isLoading } = useAssets.document.get();
  const navigate = useNavigate();
  const t = useTranslation('coldchain');
  const { setSuffix } = useBreadcrumbs();

  useEffect(() => {
    setSuffix(data?.code ?? '');
  }, [setSuffix, data?.code]);

  if (isLoading) return <DetailFormSkeleton />;

  const tabs = [
    {
      Component: <Summary onChange={() => {}} draft={data} />,
      value: 'Summary',
    },
    {
      Component: <Details />,
      value: 'Details',
    },
    {
      Component: <StatusLogs />,
      value: 'StatusLogs',
    },
    {
      Component: <Documents />,
      value: 'Documents',
    },
  ];

  return (
    <React.Suspense fallback={<DetailFormSkeleton />}>
      {data ? (
        <>
          <AppBarButtons />
          <Toolbar />
          <DetailTabs tabs={tabs} />
          <Footer />
        </>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Coldchain)
                .addPart(AppRoute.Equipment)
                .build()
            )
          }
          title={t('error.asset-not-found')}
          message={t('messages.click-to-return-to-assets')}
        />
      )}
    </React.Suspense>
  );
};
