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
// import { Toolbar } from './Toolbar';
// import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
// import { SidePanel } from './SidePanel';
import { OutboundReturnDetailRowFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
// import { Draft } from '../..';
import { OutboundReturnEditModal } from '../modals';

export const DetailView: FC = () => {
  // const isDisabled = useReturn.utils.isDisabled();
  const { onOpen, onClose, isOpen, entity: itemId } = useEditModal<string>();
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
            />
          )}

          <Toolbar />
          <DetailTabs tabs={tabs} />
          {/* <Footer /> */}
          {/* <SidePanel /> */}
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
