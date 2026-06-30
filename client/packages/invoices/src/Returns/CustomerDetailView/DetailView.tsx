import React, { useCallback, useEffect, useState } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  useEditModal,
  useBreadcrumbs,
  useUrlQuery,
  AppFooterStatusPortal,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { SidePanel } from './SidePanel/SidePanel';
import { ActivityLogList } from '@openmsupply-client/system';
import { DetailsTab } from './Tabs/Details';
import { CustomerReturnDetailTabs } from './types';
import { StatusFooter } from './Footer';
import { InvoiceCustomFieldsTab } from '../../common';

export const CustomerReturnDetailView = () => {
  const { data, isLoading } = useReturns.document.customerReturn();
  const { mutateAsync: update } = useReturns.document.updateCustomerReturn();
  const isDisabled = useReturns.utils.customerIsDisabled();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const { urlQuery, updateQuery } = useUrlQuery();
  const [isDirtyProperties, setIsDirtyProperties] = useState(false);

  const lineEditModal = useEditModal<string>();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  const onAddItem = useCallback(
    (itemId?: string | null) => {
      // The line-edit modal lives inside the Details tab. If the user is on
      // another tab, switch first so the modal mounts.
      const currentTab = urlQuery['tab'] ?? CustomerReturnDetailTabs.Details;
      if (currentTab !== CustomerReturnDetailTabs.Details) {
        updateQuery({ tab: CustomerReturnDetailTabs.Details });
      }
      lineEditModal.onOpen(itemId);
    },
    [lineEditModal, urlQuery, updateQuery]
  );

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <DetailsTab lineEdit={lineEditModal} />,
      value: CustomerReturnDetailTabs.Details,
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
      value: CustomerReturnDetailTabs.Log,
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons onAddItem={onAddItem} />
          <Toolbar />
          <DetailTabs
            tabs={tabs}
            requiresConfirmation={tab =>
              tab === 'Properties' && isDirtyProperties
            }
          />
          {/* Fallback status footer for tabs that don't own the lines table.
            The Details tab's `Footer` mounts an `AppFooterPortal` only when
            rows are selected; otherwise this portal shows the status crumbs. */}
          <AppFooterStatusPortal Content={<StatusFooter />} />
          <SidePanel />
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
