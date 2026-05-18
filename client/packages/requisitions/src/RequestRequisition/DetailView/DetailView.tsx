import React, { useCallback, useEffect, useMemo } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  RequisitionNodeStatus,
  RouteBuilder,
  useNavigate,
  useTranslation,
  DetailTabs,
  useAuthContext,
  useBreadcrumbs,
  useEditModal,
  useToggle,
  useNonPaginatedMaterialTable,
  usePluginProvider,
  NothingHere,
  MaterialTable,
  useUrlQuery,
} from '@openmsupply-client/common';
import {
  ActivityLogList,
  DocumentsTable,
  UploadDocumentModal,
} from '@openmsupply-client/system';
import { RequestLineFragment, useHideOverStocked, useRequest } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { AppRoute } from '@openmsupply-client/config';
import { RequestRequisitionLineErrorProvider } from '../context';
import { IndicatorsTab } from './IndicatorsTab';
import { RequestLineEditModal } from './RequestLineEdit';
import { useRequestColumns } from './columns';
import { isRequestLinePlaceholderRow } from '../../utils';
import { InternalOrderDetailTabs } from './types';

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

  const { data, isLoading, invalidateQueries } = useRequest.document.get();
  const isDisabled = useRequest.utils.isDisabled();
  const {
    toggleOn: toggleUploadModal,
    isOn: isUploadModalOpen,
    toggleOff: toggleCloseUploadModal,
  } = useToggle();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useRequest.document.indicators(
      store?.nameId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );
  const { urlQuery, updateQuery } = useUrlQuery();

  const deletableDocumentIds = useMemo(() => {
    if (data?.status === RequisitionNodeStatus.Finalised) {
      return new Set<string>();
    }
    // Request requisition can't have documents linked to response requisition.
    // So all documents linked to request requisition are deletable.
    return undefined;
  }, [data?.status]);

  const onRowClick = useCallback(
    (line: RequestLineFragment) => onOpen(line.item.id),
    [onOpen]
  );

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.requisitionNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.requisitionNumber]);

  const onAddItem = () => onOpen();
  const onOpenUploadModal = useCallback(() => {
    toggleUploadModal();
    const currentTab = urlQuery['tab'] ?? InternalOrderDetailTabs.Details;
    if (currentTab !== InternalOrderDetailTabs.Documents) {
      updateQuery({ tab: InternalOrderDetailTabs.Documents });
    }
  }, [toggleUploadModal, urlQuery, updateQuery]);

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
    getIsPlaceholderRow: row => isRequestLinePlaceholderRow(row.original),
    onRowClick,
    initialSort: { key: 'itemName', dir: 'asc' },
    manualFiltering: true,
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

  if (isLoading) return <DetailViewSkeleton />;
  if (!data)
    return (
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

  const tabs = [
    {
      Component: (
        <>
          {plugins.requestRequisitionLine?.tableStateLoader?.map(
            (StateLoader, index) => (
              <StateLoader
                key={index}
                requestLines={lines}
                requisition={data}
              />
            )
          )}
          <MaterialTable table={table} />
        </>
      ),
      value: 'Details',
    },
    {
      Component: (
        <DocumentsTable
          recordId={data?.id ?? ''}
          documents={data?.documents?.nodes ?? []}
          tableName="requisition"
          invalidateQueries={invalidateQueries}
          deletableDocumentIds={deletableDocumentIds}
        />
      ),
      value: t('label.documents'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  const showIndicatorTab =
    !!data.programName &&
    !!data.otherParty.store &&
    programIndicators?.totalCount !== 0 &&
    !data.isEmergency;

  if (showIndicatorTab) {
    tabs.push({
      Component: (
        <IndicatorsTab
          isLoading={isLoading || isProgramIndicatorsLoading}
          indicators={programIndicators?.nodes}
          disabled={isDisabled}
        />
      ),
      value: t('label.indicators'),
    });
  }

  return (
    <RequestRequisitionLineErrorProvider>
      <AppBarButtons
        isDisabled={!data || isDisabled}
        onAddItem={onAddItem}
        openUploadModal={onOpenUploadModal}
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

      {isUploadModalOpen && (
        <UploadDocumentModal
          isOn={isUploadModalOpen}
          toggleOff={toggleCloseUploadModal}
          recordId={data?.id ?? ''}
          tableName="requisition"
          invalidateQueries={invalidateQueries}
        />
      )}
    </RequestRequisitionLineErrorProvider>
  );
};
