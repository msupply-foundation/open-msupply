import React, { FC } from 'react';
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
  useEditModal,
} from '@openmsupply-client/common';
import { ContentArea } from './ContentArea';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { InboundReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { SidePanel } from './SidePanel/SidePanel';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { InboundReturnItem } from '../../types';
import { InboundReturnEditModal } from '../modals';

export const InboundReturnDetailView: FC = () => {
  const { data, isLoading } = useReturns.document.inboundReturn();
  const t = useTranslation('distribution');
  const navigate = useNavigate();

  const {
    onOpen,
    onClose,
    isOpen,
    entity: itemId,
    mode,
  } = useEditModal<string>();

  const onRowClick = (row: InboundReturnLineFragment | InboundReturnItem) =>
    onOpen(row.itemId);

  const onAddItem = () => onOpen();

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <ContentArea onRowClick={onRowClick} onAddItem={onAddItem} />,
      value: t('label.details'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore<InboundReturnLineFragment>({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
          <AppBarButtons onAddItem={onAddItem} />
          {isOpen && (
            <InboundReturnEditModal
              isOpen={isOpen}
              onClose={onClose}
              outboundShipmentLineIds={[]}
              customerId={data.otherPartyId}
              returnId={data.id}
              initialItemId={itemId}
              modalMode={mode}
            />
          )}

          <Toolbar />
          <DetailTabs tabs={tabs} />
          <SidePanel />
          <Footer />
        </TableProvider>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.InboundReturn)
                .build()
            )
          }
          title={t('error.return-not-found')}
          message={t('messages.click-to-return-to-inbound-returns')}
        />
      )}
    </React.Suspense>
  );
};
