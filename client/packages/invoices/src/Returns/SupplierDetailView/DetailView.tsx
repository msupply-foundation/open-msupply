import React, { useEffect } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  useEditModal,
  DetailTabs,
  useBreadcrumbs,
  NothingHere,
  useNonPaginatedMaterialTable,
  MaterialTable,
  Groupable,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { SupplierReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { SupplierReturnEditModal } from '../modals';
import { getNextItemId } from '../../utils';
import { useSupplierReturnColumns } from './columns';

export const SupplierReturnsDetailView = () => {
  const {
    onOpen,
    onClose,
    isOpen,
    entity: itemId,
    mode,
  } = useEditModal<string>();
  const { data, isLoading } = useReturns.document.supplierReturn();
  const { lines } = useReturns.lines.supplierReturnRows();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  const onAddItem = () => onOpen();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  const isDisabled = useReturns.utils.supplierIsDisabled();
  const columns = useSupplierReturnColumns();

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<Groupable<SupplierReturnLineFragment>>({
      tableId: 'supplier-return-detail',
      onRowClick: row => onOpen(row.itemId),
      columns,
      isLoading,
      data: lines,
      grouping: { enabled: true },
      enableRowSelection: !isDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-outbound-items')}
          onCreate={isDisabled ? undefined : () => onAddItem()}
          buttonText={t('button.add-item')}
        />
      ),
    });

  const tabs = [
    {
      Component: <MaterialTable table={table} />,
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
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
          <Footer
            selectedRows={selectedRows}
            resetRowSelection={table.resetRowSelection}
          />
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
