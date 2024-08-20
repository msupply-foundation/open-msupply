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
  DetailTabs,
  useEditModal,
} from '@openmsupply-client/common';
import { ContentArea } from './ContentArea';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { CustomerReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { SidePanel } from './SidePanel/SidePanel';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { CustomerReturnItem } from '../../types';
import { CustomerReturnEditModal } from '../modals';
import { getNextItemId } from '../../utils';

const CustomerReturnsDetailViewComponent = () => {
  const { data, isLoading } = useReturns.document.customerReturn();
  const { rows } = useReturns.lines.customerReturnRows();
  const t = useTranslation('distribution');
  const navigate = useNavigate();

  const {
    onOpen,
    onClose,
    isOpen,
    entity: itemId,
    mode,
  } = useEditModal<string>();

  const onRowClick = (row: CustomerReturnLineFragment | CustomerReturnItem) =>
    onOpen(row.itemId);

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <ContentArea onRowClick={onRowClick} onAddItem={onOpen} />,
      value: t('label.details'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
  ];

  const nextItemId = getNextItemId(rows ?? [], itemId);

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore<CustomerReturnLineFragment>({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
          <AppBarButtons onAddItem={onOpen} />
          {isOpen && (
            <CustomerReturnEditModal
              isOpen={isOpen}
              onClose={onClose}
              outboundShipmentLineIds={[]}
              customerId={data.otherPartyId}
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
          <SidePanel />
          <Footer />
        </TableProvider>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.CustomerReturn)
                .build()
            )
          }
          title={t('error.return-not-found')}
          message={t('messages.click-to-return-to-customer-returns')}
        />
      )}
    </React.Suspense>
  );
};

export const CustomerReturnDetailView = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<CustomerReturnLineFragment>({
      initialSortBy: {
        key: 'itemName',
      },
    })}
  >
    <CustomerReturnsDetailViewComponent />
  </TableProvider>
);
