import React, { FC, useCallback } from 'react';
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
import {
  toItemRow,
  ItemRowFragment,
  LogList,
} from '@openmsupply-client/system';
import { ContentArea } from './ContentArea';
import { OutboundLineEdit } from './OutboundLineEdit';
import { OutboundItem } from '../../types';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useOutbound } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { OutboundLineFragment } from '../api/operations.generated';

export const DetailView: FC = () => {
  const isDisabled = useOutbound.utils.isDisabled();
  const { entity, mode, onOpen, onClose, isOpen } =
    useEditModal<ItemRowFragment>();
  const { data, isLoading } = useOutbound.document.get();
  const t = useTranslation('distribution');
  const navigate = useNavigate();
  const onRowClick = useCallback(
    (item: OutboundLineFragment | OutboundItem) => {
      onOpen(toItemRow(item));
    },
    [toItemRow, onOpen]
  );

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={onOpen}
        />
      ),
      value: 'Details',
    },
    {
      Component: <LogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <TableProvider
          createStore={createTableStore()}
          queryParamsStore={createQueryParamsStore<
            OutboundLineFragment | OutboundItem
          >({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
          <AppBarButtons onAddItem={onOpen} />
          {isOpen && (
            <OutboundLineEdit
              item={entity}
              mode={mode}
              isOpen={isOpen}
              onClose={onClose}
            />
          )}

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
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.OutboundShipment)
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
