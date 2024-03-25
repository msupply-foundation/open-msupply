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
  useEditModal,
  DetailTabs,
} from '@openmsupply-client/common';
import { ContentArea } from './ContentArea';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { OutboundReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { OutboundReturnEditModal } from '../modals';
import { OutboundReturnItem } from '../../types';

export const OutboundReturnsDetailView: FC = () => {
  const {
    onOpen,
    onClose,
    isOpen,
    entity: itemId,
    mode,
  } = useEditModal<string>();
  const { data, isLoading } = useReturns.document.outboundReturn();
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
      Component: <p>To-do</p>,
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
          queryParamsStore={createQueryParamsStore<OutboundReturnLineFragment>({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
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
