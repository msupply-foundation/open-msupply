import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
} from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { useDraftInbound } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { GeneralTab } from './GeneralTab';
import { InboundLineEdit } from './modals/InboundLineEdit';
import { InvoiceLine, InboundShipmentItem } from '../../types';

export const DetailView: FC = () => {
  const { draft, isLoading } = useDraftInbound();
  const { onOpen, onClose, mode, entity, isOpen } = useEditModal<Item>();
  const navigate = useNavigate();
  const t = useTranslation('replenishment');

  const onRowClick = React.useCallback(
    (line: InboundShipmentItem | InvoiceLine) => {
      const item = toItem(line);
      onOpen(item);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {draft ? (
        <TableProvider createStore={createTableStore}>
          <AppBarButtons onAddItem={() => onOpen()} />

          <Toolbar />

          <GeneralTab onRowClick={onRowClick} />

          <Footer />
          <SidePanel />

          {isOpen && (
            <InboundLineEdit
              isOpen={isOpen}
              onClose={onClose}
              mode={mode}
              item={entity}
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
