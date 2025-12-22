import React, { useCallback, useEffect } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  ModalMode,
  useEditModal,
  useBreadcrumbs,
  useNonPaginatedMaterialTable,
  Groupable,
  NothingHere,
  MaterialTable,
} from '@openmsupply-client/common';
import { toItemRow, ActivityLogList } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { PrescriptionLineFragment, usePrescription } from '../api';
import { AppBarButtons } from './AppBarButton';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { Footer } from './Footer';
import { StockOutLineFragment, Draft } from '../../StockOut';
import { HistoryModal } from './History/HistoryModal';
import { isPrescriptionPlaceholderRow } from '../../utils';
import { usePrescriptionColumn } from './columns';

export const PrescriptionDetailView = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const {
    query: { data, loading },
    rows,
    isDisabled,
  } = usePrescription();
  const columns = usePrescriptionColumn();

  const {
    entity: historyEntity,
    mode: historyMode,
    onOpen: onOpenHistory,
    onClose: onCloseHistory,
    isOpen: isHistoryOpen,
    setMode: setHistoryMode,
  } = useEditModal<Draft>();

  const onRowClick = useCallback(
    (line: StockOutLineFragment) => {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(String(data?.id))
          .addPart(line.item.id)
          .build()
      );
    },
    [toItemRow, data]
  );
  const onAddItem = () => {
    navigate(
      RouteBuilder.create(AppRoute.Dispensary)
        .addPart(AppRoute.Prescription)
        .addPart(String(data?.id))
        .addPart(String('new'))
        .build()
    );
  };
  const onViewHistory = (draft?: Draft) => {
    onOpenHistory(draft);
    setHistoryMode(ModalMode.Create);
  };

  const { table, selectedRows } = useNonPaginatedMaterialTable<
    Groupable<PrescriptionLineFragment>
  >({
    tableId: 'prescription-detail',
    columns,
    data: rows,
    grouping: { enabled: true },
    isLoading: false,
    initialSort: { key: 'itemName', dir: 'asc' },
    isError: false,
    onRowClick: onRowClick ? row => onRowClick(row) : undefined,
    getIsPlaceholderRow: isPrescriptionPlaceholderRow,
    noDataElement: (
      <NothingHere
        body={t('error.no-prescriptions')}
        onCreate={isDisabled ? undefined : () => onAddItem()}
        buttonText={t('button.add-item')}
      />
    ),
  });

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  if (loading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <MaterialTable table={table} />,
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons onAddItem={onAddItem} onViewHistory={onViewHistory} />
          <HistoryModal
            draft={historyEntity}
            mode={historyMode}
            isOpen={isHistoryOpen}
            onClose={onCloseHistory}
            patientId={data.patientId}
            invoiceId={data.id}
          />
          <Toolbar />
          <DetailTabs tabs={tabs} />
          <Footer
            selectedRows={selectedRows}
            resetRowSelection={table.resetRowSelection}
          />
          <SidePanel />
        </>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Prescription)
                .build()
            )
          }
          title={t('error.prescription-not-found')}
          message={t('messages.click-to-return-to-prescriptions')}
        />
      )}
    </React.Suspense>
  );
};
