import React from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  useEditModal,
  DetailTabs,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { ContentArea } from './ContentArea';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { OutboundReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { OutboundReturnEditModal } from '../modals';
import { OutboundReturnItem } from '../../types';
import { getNextItemId } from '../../utils';

export const OutboundReturnsDetailViewComponent = () => {
  const {
    onOpen,
    onClose,
    isOpen,
    entity: itemId,
    mode,
  } = useEditModal<string>();
  const { data, isLoading } = useReturns.document.outboundReturn();
  const { rows } = useReturns.lines.outboundReturnRows();
  const t = useTranslation('replenishment');
  const navigate = useNavigate();

  const onRowClick = (row: OutboundReturnLineFragment | OutboundReturnItem) =>
    onOpen(row.itemId);

  const onAddItem = () => onOpen();

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

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

  const nextItemId = getNextItemId(rows ?? [], itemId);

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons onAddItem={onAddItem} />
          {isOpen && (
            <OutboundReturnEditModal
              isOpen={isOpen}
              onClose={onClose}
              stockLineIds={[]}
              supplierId={data.otherPartyId}
              returnId={data.id}
              initialItemId={itemId}
              modalMode={mode}
              loadNextItem={() => {
                if (nextItemId) onOpen(nextItemId);
                else {
                  // Closing and re-opening forces the modal to launch with the
                  // item selector in focus
                  onClose();
                  setTimeout(() => onOpen(), 50);
                }
              }}
              hasNextItem={!!nextItemId}
            />
          )}

          <Toolbar />
          <DetailTabs tabs={tabs} />
          <Footer />
          <SidePanel />
        </>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.OutboundReturn)
                .build()
            )
          }
          title={t('error.return-not-found')}
          message={t('messages.click-to-return-to-returns')}
        />
      )}
    </React.Suspense>
  );
};

export const OutboundReturnsDetailView = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<OutboundReturnLineFragment>({
      initialSortBy: {
        key: 'itemName',
      },
    })}
  >
    <OutboundReturnsDetailViewComponent />
  </TableProvider>
);
