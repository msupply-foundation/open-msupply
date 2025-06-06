import React, { useCallback, useEffect } from 'react';
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
  useBreadcrumbs,
  useEditModal,
  PreferenceKey,
  usePreference,
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
import { buildIndicatorEditRoute } from './utils';
import { RequestLineEditModal } from './RequestLineEdit';

export const DetailView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { store } = useAuthContext();
  const { data: { manageVaccinesInDoses } = { manageVaccinesInDoses: false } } =
    usePreference(PreferenceKey.ManageVaccinesInDoses);
  const {
    onOpen,
    onClose,
    mode,
    entity: itemId,
    isOpen,
  } = useEditModal<string | null>();

  const { data, isLoading } = useRequest.document.get();
  const isDisabled = useRequest.utils.isDisabled();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useRequest.document.indicators(
      store?.nameId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );

  const onRowClick = useCallback(
    (line: RequestLineFragment) => {
      onOpen(line.item.id);
    },
    [onOpen]
  );

  const onProgramIndicatorClick = useCallback(
    (
      requisitionId?: string,
      programIndicatorCode?: string,
      indicatorId?: string
    ) => {
      if (!requisitionId || !programIndicatorCode || !indicatorId) return;

      navigate(
        buildIndicatorEditRoute(
          requisitionId,
          programIndicatorCode,
          indicatorId
        )
      );
    },
    []
  );

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.requisitionNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.requisitionNumber]);

  if (isLoading) return <DetailViewSkeleton />;

  const onAddItem = () => {
    onOpen();
  };

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={onRowClick}
          onAddItem={onAddItem}
          manageVaccinesInDoses={manageVaccinesInDoses}
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
    !!data?.programName &&
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
        <AppBarButtons
          isDisabled={!data || isDisabled}
          onAddItem={onAddItem}
          showIndicators={showIndicatorTab}
        />
        <Toolbar />

        <DetailTabs tabs={tabs} />

        <Footer />
        <SidePanel />
        {isOpen && (
          <RequestLineEditModal
            requisition={data}
            itemId={itemId}
            isOpen={isOpen}
            onClose={onClose}
            mode={mode}
            store={store}
            manageVaccinesInDoses={manageVaccinesInDoses}
          />
        )}
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
