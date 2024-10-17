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
import { SupplierReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { SupplierReturnEditModal } from '../modals';
import { SupplierReturnItem } from '../../types';
import { getNextItemId } from '../../utils';

export const SupplierReturnsDetailViewComponent = () => {
  const {
    onOpen,
    onClose,
    isOpen,
    entity: itemId,
    mode,
  } = useEditModal<string>();
  const { data, isLoading } = useReturns.document.supplierReturn();
  const { rows } = useReturns.lines.supplierReturnRows();
  const t = useTranslation('replenishment');
  const navigate = useNavigate();

  const onRowClick = (row: SupplierReturnLineFragment | SupplierReturnItem) =>
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
            <SupplierReturnEditModal
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
                .addPart(AppRoute.SupplierReturn)
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

export const SupplierReturnsDetailView = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<SupplierReturnLineFragment>({
      initialSortBy: {
        key: 'itemName',
      },
    })}
  >
    <SupplierReturnsDetailViewComponent />
  </TableProvider>
);
