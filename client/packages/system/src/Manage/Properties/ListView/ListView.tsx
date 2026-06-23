import React, { useMemo } from 'react';
import {
  NothingHere,
  useTranslation,
  useNonPaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  useNavigate,
  Box,
  Chip,
  ZapIcon,
  PropertyNodeDisplayModeV2,
} from '@openmsupply-client/common';
import { PropertyConfigRowFragment, useProperties } from '../api';
import { PROPERTY_SCOPES, formatValueType } from '../utils';

const scopeLabelKey = (tableName: string) =>
  PROPERTY_SCOPES.find(scope => scope.tableName === tableName)?.labelKey;

/** Chips for the scopes a property is shown on (hidden/unassociated omitted). */
const AppearsOnCell = ({ row }: { row: { original: PropertyConfigRowFragment } }) => {
  const t = useTranslation();
  const ordering = PROPERTY_SCOPES.map(scope => scope.tableName);
  const shown = row.original.scopes
    .filter(scope => scope.displayMode !== PropertyNodeDisplayModeV2.Hidden)
    .sort(
      (a, b) => ordering.indexOf(a.tableName) - ordering.indexOf(b.tableName)
    );

  if (shown.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, paddingY: 0.5 }}>
      {shown.map(scope => {
        const labelKey = scopeLabelKey(scope.tableName);
        const prominent =
          scope.displayMode === PropertyNodeDisplayModeV2.Prominent;
        return (
          <Chip
            key={scope.id}
            size="small"
            variant="outlined"
            color={prominent ? 'primary' : 'default'}
            icon={prominent ? <ZapIcon fontSize="small" /> : undefined}
            label={labelKey ? t(labelKey) : scope.tableName}
          />
        );
      })}
    </Box>
  );
};

export const PropertiesListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { data: properties = [], isLoading, isError } = useProperties();

  const columns = useMemo(
    (): ColumnDef<PropertyConfigRowFragment>[] => [
      {
        accessorKey: 'name',
        header: t('label.name'),
        enableSorting: true,
      },
      {
        id: 'valueType',
        header: t('label.type'),
        accessorFn: row => formatValueType(row.valueType),
        enableSorting: true,
      },
      {
        id: 'appearsOn',
        header: t('label.appears-on'),
        enableSorting: false,
        Cell: AppearsOnCell,
      },
    ],
    [t]
  );

  const { table } = useNonPaginatedMaterialTable<PropertyConfigRowFragment>({
    tableId: 'property-config-list',
    columns,
    data: properties,
    isLoading,
    isError,
    localStateOnly: true,
    getRowId: row => row.id,
    onRowClick: row => navigate(row.id),
    noDataElement: <NothingHere body={t('error.no-properties')} />,
  });

  return <MaterialTable table={table} />;
};
