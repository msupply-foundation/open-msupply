import React, { ReactElement, Suspense, useEffect } from 'react';
import {
  AlertModal,
  createQueryParamsStore,
  createTableStore,
  DetailTabs,
  DetailViewSkeleton,
  RouteBuilder,
  TableProvider,
  useBreadcrumbs,
  useEditModal,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

import { useGoodsReceived } from '../api/hooks';
import { ContentArea } from './Tabs';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { GoodsReceivedLineEditModal } from './LineEdit';
import { GoodsReceivedLineFragment } from '../api/operations.generated';

export const DetailViewInner = (): ReactElement => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const {
    query: { data, isLoading },
  } = useGoodsReceived();

  const { onClose, isOpen, entity: lineId } = useEditModal<string | null>();

  console.info('Goods Received Detail View Data:', data);

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  if (isLoading) return <DetailViewSkeleton />;

  const tabs = [
    {
      Component: <ContentArea />,
      value: 'General',
    },
    // Add more tabs as needed
  ];

  return (
    <Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons />
          <Toolbar />
          <DetailTabs tabs={tabs} />
          <Footer />
          <SidePanel />
          <GoodsReceivedLineEditModal
            lineId={''}
            onClose={onClose}
            isOpen={true}
          />
        </>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.GoodsReceived)
                .build()
            )
          }
          title={t('error.goods-received-not-found')}
          message={t('messages.click-to-return-to-goods-received')}
        />
      )}
    </Suspense>
  );
};

export const GoodsReceivedDetailView = () => {
  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore<GoodsReceivedLineFragment>({
        initialSortBy: {
          key: 'itemName',
        },
      })}
    >
      <DetailViewInner />
    </TableProvider>
  );
};
