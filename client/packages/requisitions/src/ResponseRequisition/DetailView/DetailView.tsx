import React, { FC, useCallback, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  createQueryParamsStore,
  DetailTabs,
  IndicatorLineRowNode,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar/Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { useResponse, ResponseLineFragment, ResponseFragment } from '../api';
import { IndicatorsTab } from './IndicatorsTab';
import { ResponseRequisitionLineErrorProvider } from '../context';
import { buildItemEditRoute } from '../utils';
import { ProgramIndicatorFragment } from '../../RequestRequisition/api';

export const DetailView: FC = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const { data, isLoading } = useResponse.document.get();
  const isDisabled = useResponse.utils.isDisabled();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      data?.otherPartyId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );

  const onRowClick = useCallback((line: ResponseLineFragment) => {
    navigate(buildItemEditRoute(line.requisitionId, line.item.id));
  }, []);

  const onProgramIndicatorClick = useCallback(
    (
      programIndicator?: ProgramIndicatorFragment,
      indicatorLine?: IndicatorLineRowNode,
      response?: ResponseFragment
    ) => {
      if (!response || !indicatorLine) return;
      navigate(
        RouteBuilder.create(AppRoute.Distribution)
          .addPart(AppRoute.CustomerRequisition)
          .addPart(String(response.id))
          .addPart(AppRoute.Indicators)
          .addPart(String(programIndicator?.code))
          .addPart(String(indicatorLine.id))
          .build()
      );
    },
    []
  );

  const onAddItem = () => {
    navigate(buildItemEditRoute(data?.id, 'new'));
  };

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.requisitionNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.requisitionNumber]);

  if (isLoading) return <DetailViewSkeleton />;

  const showIndicatorTab =
    data?.programName &&
    !!data?.otherParty.store &&
    programIndicators?.totalCount !== 0 &&
    !data?.isEmergency;

  const tabs = [
    {
      Component: (
        <ContentArea
          onAddItem={onAddItem}
          onRowClick={onRowClick}
          disableAddLine={
            isDisabled || !!data?.linkedRequisition || !!data?.programName
          }
        />
      ),
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  if (showIndicatorTab) {
    tabs.push({
      Component: (
        <IndicatorsTab
          onClick={onProgramIndicatorClick}
          isLoading={isLoading || isProgramIndicatorsLoading}
          response={data}
          indicators={programIndicators?.nodes}
        />
      ),
      value: t('label.indicators'),
    });
  }

  return !!data ? (
    <ResponseRequisitionLineErrorProvider>
      <TableProvider
        createStore={createTableStore}
        queryParamsStore={createQueryParamsStore<ResponseLineFragment>({
          initialSortBy: { key: 'itemName' },
        })}
      >
        <AppBarButtons
          isDisabled={isDisabled}
          hasLinkedRequisition={!!data.linkedRequisition}
          isProgram={!!data.programName}
          onAddItem={onAddItem}
        />
        <Toolbar />
        <DetailTabs tabs={tabs} />

        <Footer />
        <SidePanel />
      </TableProvider>
    </ResponseRequisitionLineErrorProvider>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerRequisition)
            .build()
        )
      }
      title={t('error.requisition-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
