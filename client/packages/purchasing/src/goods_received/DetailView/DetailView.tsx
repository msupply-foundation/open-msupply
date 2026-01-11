import React, { ReactElement, Suspense, useCallback, useEffect } from 'react';
import {
  AlertModal,
  DetailTabs,
  DetailViewSkeleton,
  GoodsReceivedNodeStatus,
  RouteBuilder,
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

export const GoodsReceivedDetailView = (): ReactElement => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const {
    query: { data, isLoading },
  } = useGoodsReceived();

  const {
    onOpen,
    onClose,
    isOpen,
    entity: lineId,
  } = useEditModal<string | null>();

  const onRowClick = useCallback(
    (line: GoodsReceivedLineFragment) => {
      onOpen(line.id);
    },
    [onOpen]
  );

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  if (isLoading) return <DetailViewSkeleton />;

  const isDisabled = !data || data?.status !== GoodsReceivedNodeStatus.New;

  const tabs = [
    {
      Component: (
        <ContentArea
          lines={data?.lines.nodes || []}
          isDisabled={isDisabled}
          onRowClick={onRowClick}
        />
      ),
      value: 'General',
    },
  ];

  return (
    <Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons />
          <Toolbar isDisabled={isDisabled} />
          <DetailTabs tabs={tabs} />
          <Footer />
          <SidePanel isDisabled={isDisabled} />
          {isOpen && lineId && (
            <GoodsReceivedLineEditModal
              lineId={lineId}
              onClose={onClose}
              isOpen={isOpen}
            />
          )}
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
