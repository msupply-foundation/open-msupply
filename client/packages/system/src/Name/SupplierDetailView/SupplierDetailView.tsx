import { DetailTabs, TabDefinition } from '@common/components';
import React, { ReactElement, useEffect } from 'react';
import { Details } from '../Details';
import { useBreadcrumbs, useParams } from '@openmsupply-client/common';
import { useName } from '../api';

enum SuppliersTabValue {
  Details = 'details',
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
  ];

  return <DetailTabs tabs={tabs} />;
};
