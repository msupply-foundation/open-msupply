import React, { useEffect } from 'react';
import {
  // DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  DetailTabs,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { ContentArea } from './ContentArea';
// import { useResponse, ResponseLineFragment } from '../api';
// import { ResponseLineEdit } from './ResponseLineEdit';

export const RnRFormDetailView = () => {
  // const isDisabled = useResponse.utils.isDisabled();
  // const { data, isLoading } = useResponse.document.get();
  const navigate = useNavigate();
  const t = useTranslation('programs');
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  // const onRowClick = useCallback(
  //   (line: ResponseLineFragment) => {
  //     onOpen(line);
  //   },
  //   [onOpen]
  // );

  // if (isLoading) return <DetailViewSkeleton />;
  const data = { id: '1' };
  const tabs = [
    {
      Component: <ContentArea />,
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  useEffect(() => {
    setCustomBreadcrumbs({ 1: 'April 2024' });
  }, [setCustomBreadcrumbs]);

  return !!data ? (
    <>
      <AppBarButtons />
      <DetailTabs tabs={tabs} />

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
