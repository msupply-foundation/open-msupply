import React, { useMemo, useState } from 'react';
import {
  NothingHere,
  useEditModal,
  useToggle,
  useTranslation,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  MaterialTable,
  PropertyNodeValueType,
  PropertyV2TypeEnum,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { StoreEditModal } from './StoreEditModal';
import { AppBarButtons } from './AppBarButtons';
import { PropertiesImportModal } from '../ImportProperties/PropertiesImportModal';
import { FacilityNameRowFragment } from '../../api/operations.generated';
import { Toolbar } from './Toolbar';

// Parse the legacy `properties` JSON string defensively — older rows can
// carry malformed JSON from prior sync versions; we render those as blank
// rather than crashing the whole table.
const readLegacyProperty = (
  raw: string | null | undefined,
  key: string
): string | number | boolean | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const v = parsed?.[key];
    if (v === undefined || v === null) return null;
    if (typeof v === 'object') return JSON.stringify(v);
    return v as string | number | boolean;
  } catch {
    return null;
  }
};

// Pulls the populated value column out of a V2 propertyV2Values entry,
// picking the right field for the property's type. Option-typed properties
// render the option's display `name`.
const readV2Property = (
  row: FacilityNameRowFragment,
  propertyId: string,
  type: PropertyV2TypeEnum
): string | number | boolean | null => {
  const pv = row.propertyV2Values?.find(v => v.property.id === propertyId);
  if (!pv) return null;
  if (type === PropertyV2TypeEnum.Option) return pv.option?.name ?? '';
  if (type === PropertyV2TypeEnum.Text) return pv.valueText ?? '';
  if (type === PropertyV2TypeEnum.Number) return pv.valueNumber ?? '';
  if (type === PropertyV2TypeEnum.Real) return pv.valueReal ?? '';
  if (type === PropertyV2TypeEnum.Date) return pv.valueDate ?? '';
  return null;
};

export const StoresListView = () => {
  const t = useTranslation();
  const [selectedId, setSelectedId] = useState('');

  // V2 definitions feed two things: which IDs are option-typed (so the
  // useStores hook builds the right filter shape) and which columns to add.
  const { data: v2Properties } =
    useName.document.namePropertyDefinitions();
  const optionPropertyIds = useMemo(
    () =>
      new Set(
        (v2Properties ?? [])
          .filter(p => p.type === PropertyV2TypeEnum.Option)
          .map(p => p.id)
      ),
    [v2Properties]
  );

  const { data, isError, isFetching } =
    useName.document.stores(optionPropertyIds);
  const { data: legacyProperties, isLoading: propertiesLoading } =
    useName.document.properties();

  const { isOpen, onClose, onOpen } = useEditModal<FacilityNameRowFragment>();
  const importPropertiesModalController = useToggle();

  const onRowClick = (row: FacilityNameRowFragment) => {
    setSelectedId(row.id);
    onOpen();
  };

  // Legacy columns: one per legacy property def. Sort id `legacy.<key>` is
  // picked up by api.ts to drive the text-JSON sort path.
  const legacyColumns = useMemo(
    (): ColumnDef<FacilityNameRowFragment>[] =>
      (legacyProperties ?? []).map(({ property }) => ({
        id: `legacy.${property.key}`,
        header: property.name,
        enableSorting: true,
        columnType:
          property.valueType === PropertyNodeValueType.Boolean
            ? ColumnType.Boolean
            : undefined,
        accessorFn: row => readLegacyProperty(row.properties, property.key) ?? '',
      })),
    [legacyProperties]
  );

  // V2 columns: one per V2 property def. Sort id `v2.<propertyId>` is picked
  // up by api.ts to drive the correlated-subquery sort over `property_v2_value`.
  const v2Columns = useMemo(
    (): ColumnDef<FacilityNameRowFragment>[] =>
      (v2Properties ?? []).map(prop => ({
        id: `v2.${prop.id}`,
        header: `${prop.name} (V2)`,
        enableSorting: true,
        accessorFn: row => readV2Property(row, prop.id, prop.type) ?? '',
      })),
    [v2Properties]
  );

  const columns = useMemo(
    (): ColumnDef<FacilityNameRowFragment>[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        size: 250,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'isSupplier',
        header: t('label.supplier'),
        columnType: ColumnType.Boolean,
      },
      {
        accessorKey: 'isCustomer',
        header: t('label.customer'),
        columnType: ColumnType.Boolean,
      },
      {
        accessorKey: 'isDonor',
        header: t('label.donor'),
        columnType: ColumnType.Boolean,
      },
      ...legacyColumns,
      ...v2Columns,
    ],
    [legacyColumns, v2Columns, t]
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'stores-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    noDataElement: <NothingHere body={t('error.no-stores')} />,
    onRowClick: onRowClick,
    enableRowSelection: false,
  });

  return (
    <>
      <Toolbar />
      <PropertiesImportModal
        isOpen={importPropertiesModalController.isOn}
        onClose={importPropertiesModalController.toggleOff}
      />
      <AppBarButtons
        importModalController={importPropertiesModalController}
        properties={legacyProperties}
        propertiesLoading={propertiesLoading}
      />
      {isOpen && (
        <StoreEditModal
          isOpen={isOpen}
          nameId={selectedId}
          onClose={onClose}
          setNextStore={setSelectedId}
        />
      )}
      <MaterialTable table={table} />
    </>
  );
};
