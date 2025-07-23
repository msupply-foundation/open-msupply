import { DetailTabs, TabDefinition } from '@common/components';
import React, { ReactElement, useEffect } from 'react';
import { Details } from '../Details';
import { useBreadcrumbs, useParams } from '@openmsupply-client/common';
import { useName } from '../api';
import { PurchaseOrder } from './PurchaseOrder';
import { Contacts } from './Contacts';

enum SuppliersTabValue {
  Details = 'details',
  PurchaseOrders = 'purchase-orders',
  Contacts = 'contacts',
}

export const SupplierDetailView = (): ReactElement => {
  const { id } = useParams();
  const { data } = useName.document.get(id ?? '');
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    if (data) setCustomBreadcrumbs({ 1: data.name });
  }, [data, setCustomBreadcrumbs]);

  const tabs: TabDefinition[] = [
    {
      Component: <Details nameId={id ?? ''} type="supplier" />,
      value: SuppliersTabValue.Details,
    },
    // TODO: Hide Purchase Orders and Conctacts tabs for non store suppliers
    {
      Component: <PurchaseOrder supplierName={data?.name ?? ''} />,
      value: SuppliersTabValue.PurchaseOrders,
    },
    {
      Component: <Contacts nameId={id ?? ''} />,
      value: SuppliersTabValue.Contacts,
    },
  ];

  return <DetailTabs tabs={tabs} />;
};
