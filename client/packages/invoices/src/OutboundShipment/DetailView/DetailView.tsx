import React, { useCallback, useEffect, useState } from 'react';
import {
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  ModalMode,
  useBreadcrumbs,
  useUrlQuery,
  AppFooterStatusPortal,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StatusFooter } from './Footer';
import { useOutbound } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { OutboundOpenedWith } from './OutboundLineEdit';
import { DetailsTab } from './Tabs/Details';
import { OutboundShipmentDetailTabs } from './types';
import { InvoiceCustomFieldsTab } from '../../common';

export const DetailView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { urlQuery, updateQuery } = useUrlQuery();

  const lineEditModal = useEditModal<OutboundOpenedWith>();

  const { data, isLoading } = useOutbound.document.get();
  const { mutateAsync: update } = useOutbound.document.update();
  const isDisabled = useOutbound.utils.isDisabled();
  const [isDirtyProperties, setIsDirtyProperties] = useState(false);

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  const onAddItem = useCallback(
    (openWith?: OutboundOpenedWith) => {
      // The line-edit modal lives inside the Details tab. If the user is on
      // another tab, switch first so the modal mounts.
      const currentTab = urlQuery['tab'] ?? OutboundShipmentDetailTabs.Details;
      if (currentTab !== OutboundShipmentDetailTabs.Details) {
        updateQuery({ tab: OutboundShipmentDetailTabs.Details });
      }
      lineEditModal.onOpen(openWith);
      lineEditModal.setMode(ModalMode.Create);
    },
    [lineEditModal, urlQuery, updateQuery]
  );

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <DetailsTab lineEdit={lineEditModal} />,
      value: OutboundShipmentDetailTabs.Details,
    },
    {
      Component: (
        <InvoiceCustomFieldsTab
          invoiceType={InvoiceNodeType.OutboundShipment}
          customFields={data?.customFields}
          onSave={async patch => {
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
      value: OutboundShipmentDetailTabs.Log,
    },
  ];

  return data ? (
    <>
      <AppBarButtons onAddItem={onAddItem} />
      <Toolbar />
      <DetailTabs
        tabs={tabs}
        requiresConfirmation={tab => tab === 'Properties' && isDirtyProperties}
      />
      {/* Fallback status footer for tabs that don't own the lines table.
        The Details tab's `Footer` mounts an `AppFooterPortal` only when rows
        are selected; otherwise this portal shows the status crumbs. */}
      <AppFooterStatusPortal Content={<StatusFooter />} />
      <SidePanel />
    </>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.OutboundShipment)
            .build()
        )
      }
      title={t('error.shipment-not-found')}
      message={t('messages.click-to-return-to-shipments')}
    />
  );
};
