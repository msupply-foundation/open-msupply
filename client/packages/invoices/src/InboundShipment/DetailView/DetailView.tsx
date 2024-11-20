import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  DetailTabs,
  useNotification,
  ModalMode,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  ActivityLogList,
  toItemWithPackSize,
} from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { InboundLineEdit } from './modals/InboundLineEdit';
import { InboundItem } from '../../types';
import { useInbound, InboundLineFragment } from '../api';
import { SupplierReturnEditModal } from '../../Returns';
import { canReturnInboundLines } from '../../utils';

type InboundLineItem = InboundLineFragment['item'];

export const DetailView: FC = () => {
  const { data, isLoading } = useInbound.document.get();
  const isDisabled = useInbound.utils.isDisabled();
  const { onOpen, onClose, mode, entity, isOpen } =
    useEditModal<InboundLineItem>();
  const {
    onOpen: onOpenReturns,
    onClose: onCloseReturns,
    isOpen: returnsIsOpen,
    entity: stockLineIds,
    mode: returnModalMode,
    setMode: setReturnMode,
  } = useEditModal<string[]>();
  const navigate = useNavigate();
  const t = useTranslation();
  const { info, error } = useNotification();

  const onRowClick = React.useCallback(
    (line: InboundItem | InboundLineFragment) => {
      onOpen(toItemWithPackSize(line));
    },
    [onOpen]
  );

  const onReturn = async (selectedLines: InboundLineFragment[]) => {
    if (!data || !canReturnInboundLines(data)) {
      const cantReturnSnack = info(
        t('messages.cant-return-shipment-replenishment')
      );
      cantReturnSnack();
      return;
    }
    if (!selectedLines.length) {
      const selectLinesSnack = info(t('messages.select-rows-to-return'));
      selectLinesSnack();
      return;
    }
    if (selectedLines.some(line => !line.stockLine)) {
      const errMsg = 'No stock line associated with the selected line(s).';
      const selectLinesSnack = error(`${t('error.something-wrong')} ${errMsg}`);
      selectLinesSnack();
      return;
    }

    const selectedStockLineIds = selectedLines.map(
      line => line.stockLine?.id ?? ''
    );

    onOpenReturns(selectedStockLineIds);
    setReturnMode(ModalMode.Create);
  };

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={() => onOpen()}
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
            InboundLineFragment | InboundItem
          >({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
          <AppBarButtons onAddItem={() => onOpen()} />

          <Toolbar onReturnLines={onReturn} />

          <DetailTabs tabs={tabs} />

          <Footer />
          <SidePanel />

          {isOpen && (
            <InboundLineEdit
              isDisabled={isDisabled}
              isOpen={isOpen}
              onClose={onClose}
              mode={mode}
              item={entity}
              currency={data.currency}
              isExternalSupplier={!data.otherParty.store}
            />
          )}
          {returnsIsOpen && (
            <SupplierReturnEditModal
              isOpen={returnsIsOpen}
              onClose={onCloseReturns}
              stockLineIds={stockLineIds || []}
              supplierId={data.otherParty.id}
              modalMode={returnModalMode}
              inboundShipmentId={data.id}
              isNewReturn
            />
          )}
        </TableProvider>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InboundShipment)
                .build()
            )
          }
          title={t('error.shipment-not-found')}
          message={t('messages.click-to-return-to-shipments')}
        />
      )}
    </React.Suspense>
  );
};
