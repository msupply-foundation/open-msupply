import React, { useEffect } from 'react';
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
  useBreadcrumbs,
  useNonPaginatedMaterialTable,
  Groupable,
  NothingHere,
  MaterialTable,
} from '@openmsupply-client/common';
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
import { useCustomerReturnColumns } from './columns';

const CustomerReturnsDetailViewComponent = () => {
  const { data, isLoading } = useReturns.document.customerReturn();
  const { lines } = useReturns.lines.customerReturnRows();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
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

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  const isDisabled = useReturns.utils.customerIsDisabled();
  const columns = useCustomerReturnColumns();

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<Groupable<CustomerReturnLineFragment>>({
      tableId: 'purchase-order-detail-view',
      onRowClick: row => onRowClick?.(row),
      columns,
      isLoading,
      data: lines,
      grouping: { enabled: true },
      enableRowSelection: !isDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-customer-return-items')}
          onCreate={isDisabled ? undefined : () => onOpen}
          buttonText={t('button.add-item')}
        />
      ),
    });

  const tabs = [
    {
      Component: <MaterialTable table={table} />,
      value: t('label.details'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
  ];

  const nextItemId = getNextItemId(lines ?? [], itemId);

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
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
          <Footer
            selectedRows={selectedRows}
            resetRowSelection={table.resetRowSelection}
          />
        </>
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
