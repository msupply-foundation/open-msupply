import React, { useCallback, useEffect } from 'react';
import {
  AlertModal,
  DetailTabs,
  DetailViewSkeleton,
  MaterialTable,
  NothingHere,
  PurchaseOrderLineStatusNode,
  RouteBuilder,
  useBreadcrumbs,
  useEditModal,
  useNavigate,
  useNonPaginatedMaterialTable,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { canAddNewLines, isPurchaseOrderDisabled } from '../../utils';
import { PurchaseOrderLineFragment, usePurchaseOrder } from '../api';
import { Details, GoodsReceived, Documents } from './Tabs';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { PurchaseOrderLineEditModal } from './LineEdit/PurchaseOrderLineEditModal';
import { usePurchaseOrderColumns } from './columns';
import { PurchaseOrderLineErrorProvider } from '../context';

const getPlaceholderRow = (line: PurchaseOrderLineFragment) => {
  return line.requestedNumberOfUnits === 0;
};

const getClosedLine = (line: PurchaseOrderLineFragment) => {
  return line.status === PurchaseOrderLineStatusNode.Closed;
};

export const PurchaseOrderDetailView = () => (
  <PurchaseOrderLineErrorProvider>
    <DetailViewInner />
  </PurchaseOrderLineErrorProvider>
);

const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { urlQuery } = useUrlQuery();
  const currentTab = urlQuery['tab'];

  const {
    query: { data, isFetching, isLoading },
    draft,
    handleChange,
    invalidateQueries,
  } = usePurchaseOrder();

  const {
    onOpen,
    onClose,
    mode,
    entity: lineId,
    isOpen,
  } = useEditModal<string | null>();

  const lines = React.useMemo(() => data?.lines.nodes ?? [], [data]);

  const onRowClick = useCallback(
    (line: PurchaseOrderLineFragment) => {
      onOpen(line.id);
    },
    [onOpen]
  );

  const openNext = useCallback(() => {
    const currentIndex = lines?.findIndex(line => line.id === lineId);
    const nextLine = lines[currentIndex + 1];
    if (!nextLine) return;
    onOpen(nextLine.id);
  }, [lines, onOpen, lineId]);

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  const disableNewLines = !data || !canAddNewLines(data);
  const isDisabled = !data || isPurchaseOrderDisabled(data);
  const columns = usePurchaseOrderColumns();

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<PurchaseOrderLineFragment>({
      tableId: 'purchase-order-detail-view',
      isLoading: isFetching,
      onRowClick: onRowClick,
      columns,
      data: lines,
      initialSort: { key: 'lineNumber', dir: 'asc' },
      getIsRestrictedRow: getClosedLine,
      getIsPlaceholderRow: getPlaceholderRow,
      noDataElement: (
        <NothingHere
          body={t('error.no-purchase-order-items')}
          onCreate={disableNewLines ? undefined : onOpen}
        />
      ),
    });

  const tabs = [
    {
      Component: <MaterialTable table={table} />,
      value: t('label.general'),
    },
    {
      Component: <GoodsReceived />,
      value: t('label.goods-received'),
    },
    {
      Component: <Details draft={draft} onChange={handleChange} />,
      value: t('label.details'),
    },
    {
      Component: (
        <Documents
          data={data}
          disable={isDisabled}
          invalidateQueries={invalidateQueries}
        />
      ),
      value: t('label.documents'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
  ];
  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return data ? (
    <>
      <AppBarButtons
        isDisabled={isDisabled}
        disableNewLines={disableNewLines}
        onAddItem={onOpen}
      />
      <Toolbar isDisabled={isDisabled} />
      <DetailTabs tabs={tabs} />
      <Footer
        showStatusBar={currentTab !== 'Documents'}
        status={data.status}
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      <SidePanel />
      {isOpen && (
        <PurchaseOrderLineEditModal
          purchaseOrder={data}
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
          lineId={lineId}
          isDisabled={isDisabled}
          hasNext={
            lines.findIndex(line => line.id === lineId) < lines.length - 1
          }
          openNext={openNext}
        />
      )}
    </>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.PurchaseOrder)
            .build()
        )
      }
      title={t('error.purchase-order-not-found')}
      message={t('messages.click-to-return-to-purchase-orders')}
    />
  );
};
