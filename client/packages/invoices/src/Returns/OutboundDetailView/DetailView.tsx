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
// import { toItemRow } from '@openmsupply-client/system';
import { ContentArea } from './ContentArea';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { OutboundReturnDetailRowFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
// import { Draft } from '../..';
import { OutboundReturnEditModal } from '../modals';

export const OutboundReturnsDetailView: FC = () => {
  // const isDisabled = useReturn.utils.isDisabled();
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

  const onRowClick = (row: OutboundReturnDetailRowFragment) =>
    onOpen(row.itemId);

  const onAddItem = () => onOpen();
  //  (draft?: Draft) => {
  //   onOpen(draft);
  //   setMode(ModalMode.Create);
  // };

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={onRowClick}
          onAddItem={onAddItem}
          rows={data?.lines?.nodes ?? []}
        />
      ),
      value: 'Details',
    },
    {
      Component: <p>To-do</p>,
      value: 'Log',
    },
  ];

  const getNextItemId = () => {
    const lines = data?.lines?.nodes;
    if (!lines) return undefined;
    const currentItemIndex = lines.findIndex(line => line.itemId === itemId);
    if (currentItemIndex === -1) return;

    const nextItemIndex = lines.findIndex(
      (line, index) => index > currentItemIndex && line.itemId !== itemId
    );
    return nextItemIndex === -1 ? undefined : lines[nextItemIndex]?.itemId;
  };

  const nextItemId = getNextItemId();

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore<OutboundReturnDetailRowFragment>(
            {
              initialSortBy: {
                key: 'itemName',
              },
            }
          )}
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
              loadNextItem={nextItemId ? () => onOpen(nextItemId) : undefined}
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
