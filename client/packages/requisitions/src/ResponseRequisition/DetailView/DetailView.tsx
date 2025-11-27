import React, { useCallback, useEffect } from 'react';
import {
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  DetailTabs,
  IndicatorLineRowNode,
  useBreadcrumbs,
  useEditModal,
  useAuthContext,
  useNonPaginatedMaterialTable,
  MaterialTable,
  NothingHere,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar/Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useResponse, ResponseLineFragment, ResponseFragment } from '../api';
import { IndicatorsTab, Documents } from './Tabs';
import { ResponseRequisitionLineErrorProvider } from '../context';
import { ProgramIndicatorFragment } from '../../RequestRequisition/api';
import { buildIndicatorEditRoute } from './utils';
import { ResponseLineEditModal } from './ResponseLineEdit';
import { useResponseColumns } from './columns';
import { isResponseLinePlaceholderRow } from '../../utils';

const DetailViewInner = () => {
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

  const { data, isLoading, isFetching, isError, invalidateQueries } =
    useResponse.document.get();
  const { columns } = useResponseColumns();
  const isDisabled = useResponse.utils.isDisabled();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      data?.otherPartyId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );

  const onRowClick = useCallback(
    (line: ResponseLineFragment) => {
      onOpen(line.item.id);
    },
    [onOpen]
  );

  const onProgramIndicatorClick = useCallback(
    (
      programIndicator?: ProgramIndicatorFragment,
      indicatorLine?: IndicatorLineRowNode,
      response?: ResponseFragment
    ) => {
      if (!response || !indicatorLine) return;
      navigate(
        buildIndicatorEditRoute(
          response.id,
          String(programIndicator?.code),
          indicatorLine.id
        )
      );
    },
    [navigate]
  );

  const onAddItem = () => {
    onOpen();
  };

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.requisitionNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.requisitionNumber]);

  const { table, selectedRows } = useNonPaginatedMaterialTable({
    tableId: 'response-requisition-detail',
    columns,
    data: data?.lines.nodes,
    isLoading: isFetching,
    isError,
    getIsPlaceholderRow: isResponseLinePlaceholderRow,
    onRowClick,
    initialSort: { key: 'itemName', dir: 'asc' },
    noDataElement: (
      <NothingHere
        body={t('error.no-requisition-items')}
        onCreate={isDisabled ? undefined : onAddItem}
        buttonText={t('button.add-item')}
      />
    ),
  });

  if (isLoading) return <DetailViewSkeleton />;

  const showIndicatorTab =
    data?.programName &&
    !!data?.otherParty.store &&
    programIndicators?.totalCount !== 0 &&
    !data?.isEmergency;

  const tabs = [
    {
      Component: <MaterialTable table={table} />,
      value: 'Details',
    },
    {
      Component: (
        <Documents data={data} invalidateQueries={invalidateQueries} />
      ),
      value: t('label.documents'),
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
    <>
      <AppBarButtons
        isDisabled={isDisabled}
        hasLinkedRequisition={!!data.linkedRequisition}
        isProgram={!!data.programName}
        onAddItem={onAddItem}
      />
      <Toolbar />
      <DetailTabs tabs={tabs} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      <SidePanel />
      {isOpen && (
        <ResponseLineEditModal
          requisition={data}
          itemId={itemId}
          store={store}
          mode={mode}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
    </>
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

export const DetailView = () => {
  return (
    <ResponseRequisitionLineErrorProvider>
      <DetailViewInner />
    </ResponseRequisitionLineErrorProvider>
  );
};
