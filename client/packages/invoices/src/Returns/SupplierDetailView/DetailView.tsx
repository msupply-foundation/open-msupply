import React, { useCallback, useEffect } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  useEditModal,
  DetailTabs,
  useBreadcrumbs,
  useUrlQuery,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { DetailsTab } from './Tabs/Details';
import { SupplierReturnDetailTabs } from './types';

export const SupplierReturnsDetailView = () => {
  const lineEditModal = useEditModal<string>();
  const { data, isLoading } = useReturns.document.supplierReturn();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const { urlQuery, updateQuery } = useUrlQuery();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  const onAddItem = useCallback(() => {
    // The line-edit modal lives inside the Details tab. If the user is on
    // another tab, switch first so the modal mounts.
    const currentTab = urlQuery['tab'] ?? SupplierReturnDetailTabs.Details;
    if (currentTab !== SupplierReturnDetailTabs.Details) {
      updateQuery({ tab: SupplierReturnDetailTabs.Details });
    }
    lineEditModal.onOpen();
  }, [lineEditModal, urlQuery, updateQuery]);

  const tabs = [
    {
      Component: <DetailsTab lineEdit={lineEditModal} />,
      value: SupplierReturnDetailTabs.Details,
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: SupplierReturnDetailTabs.Log,
    },
  ];

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons onAddItem={onAddItem} />
          <Toolbar />
          <DetailTabs tabs={tabs} />
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
