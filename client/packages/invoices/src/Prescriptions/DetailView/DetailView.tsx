import React, { useCallback, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  DetailTabs,
  ModalMode,
  useEditModal,
  useBreadcrumbs,
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import { toItemRow, ActivityLogList } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { usePrescription } from '../api';
import { ContentArea } from './ContentArea';
import { AppBarButtons } from './AppBarButton';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { Footer } from './Footer';
import { StockOutLineFragment, Draft } from '../../StockOut';
import { StockOutItem } from '../../types';
import { HistoryModal } from './History/HistoryModal';

export const PrescriptionDetailView = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const { data: preference } = usePreference(
    PreferenceKey.ManageVaccinesInDoses
  );
  const {
    query: { data, loading },
  } = usePrescription();

  const {
    entity: historyEntity,
    mode: historyMode,
    onOpen: onOpenHistory,
    onClose: onCloseHistory,
    isOpen: isHistoryOpen,
    setMode: setHistoryMode,
  } = useEditModal<Draft>();

  const onRowClick = useCallback(
    (item: StockOutLineFragment | StockOutItem) => {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(String(data?.id))
          .addPart(String(item.id))
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

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  if (loading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={onRowClick}
          onAddItem={onAddItem}
          displayInDoses={preference?.manageVaccinesInDoses}
        />
      ),
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
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore<
            StockOutLineFragment | StockOutItem
          >({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
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
          <Footer />
          <SidePanel />
        </TableProvider>
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
