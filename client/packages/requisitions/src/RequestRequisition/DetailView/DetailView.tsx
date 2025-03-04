import React, { FC, useCallback } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  createQueryParamsStore,
  DetailTabs,
  useAuthContext,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { RequestLineFragment, useRequest } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';
import { RequestRequisitionLineErrorProvider } from '../context';
import { IndicatorsTab } from './IndicatorsTab';
import { buildIndicatorEditRoute, buildItemEditRoute } from './utils';

export const DetailView: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRequest.document.get();
  const { store } = useAuthContext();
  const isDisabled = useRequest.utils.isDisabled();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useRequest.document.indicators(
      store?.nameId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );

  const onRowClick = useCallback((line: RequestLineFragment) => {
    navigate(buildItemEditRoute(line.requisitionNumber, line.item.id));
  }, []);

  const onProgramIndicatorClick = useCallback(
    (
      requisitionNumber?: number,
      programIndicatorCode?: string,
      indicatorId?: string
    ) => {
      if (!requisitionNumber || !programIndicatorCode || !indicatorId) return;

      navigate(
        buildIndicatorEditRoute(
          requisitionNumber,
          programIndicatorCode,
          indicatorId
        )
      );
    },
    []
  );

  if (isLoading) return <DetailViewSkeleton />;

  const onAddItem = () => {
    navigate(buildItemEditRoute(data?.requisitionNumber, 'new'));
  };
  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={onAddItem}
        />
      ),
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  const showIndicatorTab =
    data?.programName &&
    !!data?.otherParty.store &&
    programIndicators?.totalCount !== 0 &&
    !data?.isEmergency;

  if (showIndicatorTab) {
    tabs.push({
      Component: (
        <IndicatorsTab
          onClick={onProgramIndicatorClick}
          isLoading={isLoading || isProgramIndicatorsLoading}
          request={data}
          indicators={programIndicators?.nodes}
        />
      ),
      value: t('label.indicators'),
    });
  }

  return !!data ? (
    <RequestRequisitionLineErrorProvider>
      <TableProvider
        createStore={createTableStore}
        queryParamsStore={createQueryParamsStore<RequestLineFragment>({
          initialSortBy: { key: 'itemName' },
        })}
      >
        <AppBarButtons isDisabled={!data || isDisabled} onAddItem={onAddItem} />
        <Toolbar />

        <DetailTabs tabs={tabs} />

        <Footer />
        <SidePanel />
      </TableProvider>
    </RequestRequisitionLineErrorProvider>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InternalOrder)
            .build()
        )
      }
      title={t('error.order-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
