import React, { useMemo } from 'react';
import {
  useNavigate,
  NothingHere,
  useTranslation,
  ColumnDef,
  usePaginatedMaterialTable,
  useIsCentralServerApi,
  useAuthContext,
  UserPermission,
  Navigate,
  RouteBuilder,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { AppBarButtons } from './AppBarButtons';
import { PropertyDetailFragment, useProperties } from '../api';

export const PropertyListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const isCentralServer = useIsCentralServerApi();
  const { userHasPermission } = useAuthContext();
  const canEditCentral = userHasPermission(UserPermission.EditCentralData);

  // Property configuration is a central-server admin function. Mirror the
  // pattern in Manage/Preferences — query is enabled only on central + when
  // the user has EditCentralData. The nav link in ManageNav already hides
  // for non-admins; this guard catches direct URL access.
  const enabled = isCentralServer && canEditCentral;
  const { data, isLoading, isError } = useProperties(enabled);

  if (!enabled) {
    return (
      <Navigate
        to={RouteBuilder.create(AppRoute.Manage).build()}
        replace
      />
    );
  }

  const columns = useMemo(
    (): ColumnDef<PropertyDetailFragment>[] => [
      {
        header: t('label.name'),
        accessorKey: 'name',
        size: 250,
      },
      {
        header: t('label.property-type'),
        accessorKey: 'type',
        size: 120,
      },
      {
        header: t('label.property-attached-tables'),
        accessorFn: row => row.attachedTo.map(a => a.table).join(', '),
        id: 'attached-tables',
        size: 200,
      },
      {
        header: t('label.property-options'),
        accessorFn: row => row.options.filter(o => !o.isDeleted).length,
        id: 'options-count',
        size: 100,
      },
    ],
    [t]
  );

  const rows = data ?? [];

  const { table } = usePaginatedMaterialTable<PropertyDetailFragment>({
    tableId: 'property-list-view',
    isLoading,
    isError,
    columns,
    data: rows,
    enableRowSelection: false,
    onRowClick: row => navigate(row.id),
    totalCount: rows.length,
    noDataElement: <NothingHere body={t('error.no-properties')} />,
  });

  return (
    <>
      <AppBarButtons />
      <MaterialTable table={table} />
    </>
  );
};
