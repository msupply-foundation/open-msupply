import React, { useEffect, useState } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  useEditModal,
  useBreadcrumbs,
  useNonPaginatedMaterialTable,
  NothingHere,
  MaterialTable,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { CustomerReturnLineFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { SidePanel } from './SidePanel/SidePanel';
import { ActivityLogList } from '@openmsupply-client/system';
import { Footer } from './Footer';
import { CustomerReturnEditModal } from '../modals';
import { getNextItemId } from '../../utils';
import { InvoiceCustomFieldsTab } from '../../common';
import { useCustomerReturnColumns } from './columns';

export const CustomerReturnDetailView = () => {
  const { data, isLoading } = useReturns.document.customerReturn();
  const { mutateAsync: update } = useReturns.document.updateCustomerReturn();
  const { lines } = useReturns.lines.customerReturnRows();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [isDirtyProperties, setIsDirtyProperties] = useState(false);

  const {
    onOpen,
    onClose,
    isOpen,
    entity: itemId,
    mode,
  } = useEditModal<string>();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  const isDisabled = useReturns.utils.customerIsDisabled();
  const columns = useCustomerReturnColumns();

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<CustomerReturnLineFragment>({
      tableId: 'purchase-order-detail-view',
      onRowClick: row => onOpen(row.itemId),
      columns,
      isLoading,
      data: lines,
      grouping: { field: 'itemCode' },
      enableRowSelection: !isDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-customer-return-items')}
          onCreate={isDisabled ? undefined : () => onOpen()}
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
      Component: (
        <InvoiceCustomFieldsTab
          invoiceType={InvoiceNodeType.CustomerReturn}
          customFields={data?.customFields}
          onSave={async patch => {
            // id is only undefined before the return exists; the tab isn't
            // rendered until then
            if (!data?.id) return;
            return update({ id: data.id, customFields: patch });
          }}
          disabled={isDisabled}
          onEdit={setIsDirtyProperties}
        />
      ),
      value: 'custom-fields',
      confirmOnLeaving: isDirtyProperties,
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
          <DetailTabs
            tabs={tabs}
            requiresConfirmation={tab =>
              tab === 'Properties' && isDirtyProperties
            }
          />
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
