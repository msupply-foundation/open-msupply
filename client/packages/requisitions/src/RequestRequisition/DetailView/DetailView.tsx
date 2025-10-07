import React, { useCallback, useEffect } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  DetailTabs,
  useAuthContext,
  useBreadcrumbs,
  useEditModal,
  useNonPaginatedMaterialTable,
  usePluginProvider,
  NothingHere,
  MaterialTable,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { RequestLineFragment, useHideOverStocked, useRequest } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { AppRoute } from '@openmsupply-client/config';
import { RequestRequisitionLineErrorProvider } from '../context';
import { IndicatorsTab } from './IndicatorsTab';
import { buildIndicatorEditRoute } from './utils';
import { RequestLineEditModal } from './RequestLineEdit';
import { useRequestColumns } from './columns';
import { isRequestLinePlaceholderRow } from '../../utils';

export const DetailView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { store } = useAuthContext();
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
    (line: RequestLineFragment) => onOpen(line.item.id),
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

  const onAddItem = () => onOpen();

  const { lines, itemFilter, isError, isFetching } = useRequest.line.list();
  const { on } = useHideOverStocked();
  const { plugins } = usePluginProvider();
  const isFiltered = !!itemFilter || on;

  const columns = useRequestColumns();

  const { table, selectedRows } = useNonPaginatedMaterialTable({
    tableId: 'internal-order-detail',
    columns,
    data: lines,
    isLoading: isFetching,
    isError,
    getIsPlaceholderRow: isRequestLinePlaceholderRow,
    onRowClick,
    initialSort: { key: 'itemName', dir: 'asc' },
    noDataElement: (
      <NothingHere
        body={
          isFiltered
            ? t('error.no-items-filter-on')
            : t('error.no-internal-order-items')
        }
        onCreate={isDisabled ? undefined : onAddItem}
        buttonText={t('button.add-item')}
      />
    ),
  });

  const tabs = [
    {
      Component: (
        // {/* {plugins.requestRequisitionLine?.tableStateLoader?.map(
        //   (StateLoader, index) => <StateLoader key={index} requestLines={lines} />
        // )} */}
        <MaterialTable table={table} />
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

  if (isLoading) return <DetailViewSkeleton />;
  return !!data ? (
    <RequestRequisitionLineErrorProvider>
      <AppBarButtons
        isDisabled={!data || isDisabled}
        onAddItem={onAddItem}
        showIndicators={showIndicatorTab}
      />
      <Toolbar />

      <DetailTabs tabs={tabs} />

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      <SidePanel />
      {isOpen && (
        <RequestLineEditModal
          requisition={data}
          itemId={itemId}
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
          store={store}
        />
      )}
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
