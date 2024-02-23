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

type InboundLineItem = InboundLineFragment['item'];

export const DetailView: FC = () => {
  const { data, isLoading } = useInbound.document.get();
  const isDisabled = useInbound.utils.isDisabled();
  const { onOpen, onClose, mode, entity, isOpen } =
    useEditModal<InboundLineItem>();
  const navigate = useNavigate();
  const t = useTranslation('replenishment');

  const onRowClick = React.useCallback(
    (line: InboundItem | InboundLineFragment) => {
      onOpen(toItemWithPackSize(line));
    },
    [onOpen]
  );

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

          <Toolbar />

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
