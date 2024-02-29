import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  // useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  useEditModal,
  // DetailTabs,
  // ModalMode,
} from '@openmsupply-client/common';
// import { toItemRow, ActivityLogList } from '@openmsupply-client/system';
// import { ContentArea } from './ContentArea';
import { StockOutItem } from '../../types';
// import { Toolbar } from './Toolbar';
// import { Footer } from './Footer';
// import { AppBarButtons } from './AppBarButtons';
// import { SidePanel } from './SidePanel';
import { useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
// import { Draft } from '../..';
import { StockOutLineFragment } from '../../StockOut';
import { OutboundReturnEditModal } from '../modals';
// import { OutboundLineEdit } from './OutboundLineEdit';

export const DetailView: FC = () => {
  // const isDisabled = useReturn.utils.isDisabled();
  const { onOpen, onClose, isOpen } = useEditModal();
  const { data, isLoading } = useReturns.document.outboundReturn();
  const t = useTranslation('distribution');
  const navigate = useNavigate();
  // const onRowClick = useCallback(
  //   (item: StockOutLineFragment | StockOutItem) => {
  //     onOpen({ item: toItemRow(item) });
  //   },
  //   [toItemRow, onOpen]
  // );
  // const onAddItem = (draft?: Draft) => {
  //   onOpen(draft);
  //   setMode(ModalMode.Create);
  // };

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  // const tabs = [
  //   {
  //     Component: (
  //       <ContentArea
  //         // onRowClick={!isDisabled ? onRowClick : null}
  //         onAddItem={onAddItem}
  //       />
  //     ),
  //     value: 'Details',
  //   },
  //   {
  //     Component: <ActivityLogList recordId={data?.id ?? ''} />,
  //     value: 'Log',
  //   },
  // ];

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
          {JSON.stringify(data)}
          {/* <AppBarButtons onAddItem={onAddItem} /> */}
          <button onClick={() => onOpen()}>HERE</button>
          {isOpen && (
            <OutboundReturnEditModal
              isOpen={isOpen}
              onClose={onClose}
              stockLineIds={[]}
              // supplierId={data.otherParty.id}
              supplierId={'F81D5559210840C78E6CE455D4798414'}
            />
          )}

          {/* <Toolbar /> */}
          {/* <DetailTabs tabs={tabs} /> */}
          {/* <Footer /> */}
          {/* <SidePanel /> */}
        </TableProvider>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.OutboundReturn)
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
