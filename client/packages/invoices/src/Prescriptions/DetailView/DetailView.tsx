import React, { FC, useCallback } from 'react';
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
} from '@openmsupply-client/common';
import { toItemRow, ActivityLogList } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { usePrescription } from '../api';
import { ContentArea } from './ContentArea';
import { AppBarButtons } from './AppBarButton';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { Footer } from './Footer';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';
import { HistoryModal } from './History/HistoryModal';
import { Draft } from '../..';

export const PrescriptionDetailView: FC = () => {
  const {
    entity: historyEntity,
    mode: historyMode,
    onOpen: onOpenHistory,
    onClose: onCloseHistory,
    isOpen: isHistoryOpen,
    setMode: setHistoryMode,
  } = useEditModal<Draft>();
  const {
    query: { data, loading },
  } = usePrescription();
  const t = useTranslation();
  const navigate = useNavigate();
  const onRowClick = useCallback(
    (item: StockOutLineFragment | StockOutItem) => {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(String(data?.invoiceNumber))
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
        .addPart(String(data?.invoiceNumber))
        .addPart(String('new'))
        .build()
    );
  };
  const onViewHistory = (draft?: Draft) => {
    onOpenHistory(draft);
    setHistoryMode(ModalMode.Create);
  };

  if (loading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <ContentArea onRowClick={onRowClick} onAddItem={onAddItem} />,
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
