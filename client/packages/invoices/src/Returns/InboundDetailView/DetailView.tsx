import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  DetailTabs,
} from '@openmsupply-client/common';
import { ContentArea } from './ContentArea';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { InboundReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { SidePanel } from './SidePanel/SidePanel';
import { ActivityLogList } from 'packages/system/src';
import { Footer } from './Footer';

export const InboundReturnDetailView: FC = () => {
  const { data, isLoading } = useReturns.document.inboundReturn();
  const t = useTranslation('distribution');
  const navigate = useNavigate();

  const onRowClick = () => {};

  const onAddItem = () => {};

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <ContentArea onRowClick={onRowClick} onAddItem={onAddItem} />,
      value: t('label.details'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore<InboundReturnLineFragment>({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
          <AppBarButtons onAddItem={onAddItem} />

          <Toolbar />
          <DetailTabs tabs={tabs} />
          <SidePanel />
          <Footer />
        </TableProvider>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.InboundReturn)
                .build()
            )
          }
          title={t('error.return-not-found')}
          message={t('messages.click-to-return-to-inbound-returns')}
        />
      )}
    </React.Suspense>
  );
};
