import React, { useMemo } from 'react';
import { IconButton } from '@mui/material';
import {
  CheckCell,
  ColumnDef,
  ColumnType,
  DeleteIcon,
  MaterialTable,
  NumberInputCell,
  useSimpleMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import {
  LocationRowFragment,
  LocationSearchInput,
} from '@openmsupply-client/system';

export interface DraftStockMovementLineState {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  restrictedLocationTypeId?: string | null;
  fromStockLineId: string;
  fromLocationCode?: string | null;
  batch?: string | null;
  expiryDate?: string | null;
  fromPackSize: number;
  availableNumberOfPacks: number;
  onHold: boolean;
  fromNumberOfPacks?: number;
  toLocation: LocationRowFragment | null;
  toPackSize?: number;
  toNumberOfPacks?: number;
}

type CalculateField = 'fromNumberOfPacks' | 'toPackSize' | 'toNumberOfPacks';

const recalculateValues = (
  line: DraftStockMovementLineState,
  field: CalculateField,
  value?: number
): Partial<DraftStockMovementLineState> => {
  switch (field) {
    case 'fromNumberOfPacks': {
      const toPackSize = line.toPackSize ?? line.fromPackSize;
      const total = (value ?? 0) * line.fromPackSize;
      return {
        fromNumberOfPacks: value,
        toPackSize,
        toNumberOfPacks: toPackSize ? total / toPackSize : undefined,
      };
    }
    case 'toPackSize': {
      const total = (line.fromNumberOfPacks ?? 0) * line.fromPackSize;
      return {
        toPackSize: value,
        toNumberOfPacks: value ? total / value : undefined,
      };
    }
    case 'toNumberOfPacks': {
      const total = (line.fromNumberOfPacks ?? 0) * line.fromPackSize;
      return {
        toNumberOfPacks: value,
        toPackSize: value ? total / value : undefined,
      };
    }
  }
};

interface StockMovementLineTableProps {
  lines: DraftStockMovementLineState[];
  showFromLocation: boolean;
  onUpdate: (id: string, patch: Partial<DraftStockMovementLineState>) => void;
  onRemove: (id: string) => void;
}

export const StockMovementLineTable = ({
  lines,
  showFromLocation,
  onUpdate,
  onRemove,
}: StockMovementLineTableProps) => {
  const t = useTranslation();

  const columns = useMemo((): ColumnDef<DraftStockMovementLineState>[] => {
    const cols: ColumnDef<DraftStockMovementLineState>[] = [
      {
        id: 'item',
        header: t('label.item'),
        accessorFn: row => `${row.itemCode} - ${row.itemName}`,
        size: 200,
        enableSorting: false,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 110,
        enableSorting: false,
      },
      {
        id: 'expiryDate',
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry'),
        columnType: ColumnType.Date,
        size: 110,
        enableSorting: false,
      },
      {
        id: 'availableNumberOfPacks',
        accessorFn: row => row.availableNumberOfPacks,
        header: t('label.from-available-packs'),
        columnType: ColumnType.Number,
        size: 100,
        enableSorting: false,
      },
      {
        id: 'fromPackSize',
        accessorFn: row => row.fromPackSize,
        header: t('label.from-pack-size'),
        columnType: ColumnType.Number,
        size: 90,
        enableSorting: false,
      },
    ];

    if (showFromLocation) {
      cols.push({
        id: 'fromLocation',
        header: t('label.from-location'),
        accessorFn: row => row.fromLocationCode ?? '-',
        size: 110,
        enableSorting: false,
      });
    }

    cols.push(
      {
        id: 'onHold',
        header: t('label.on-hold'),
        accessorFn: row => row.onHold,
        Cell: CheckCell,
        size: 70,
        enableSorting: false,
      },
      {
        accessorKey: 'fromNumberOfPacks',
        header: t('label.from-number-of-packs'),
        size: 120,
        enableSorting: false,
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            disabled={row.onHold}
            min={0}
            max={row.availableNumberOfPacks}
            updateFn={value =>
              onUpdate(row.id, recalculateValues(row, 'fromNumberOfPacks', value))
            }
          />
        ),
      },
      {
        id: 'toLocation',
        header: t('label.to-location'),
        size: 200,
        enableSorting: false,
        Cell: ({ row: { original: row } }) => (
          <LocationSearchInput
            selectedLocation={row.toLocation}
            disabled={row.onHold}
            width={180}
            clearable
            restrictedToLocationTypeId={row.restrictedLocationTypeId}
            onChange={toLocation => onUpdate(row.id, { toLocation })}
          />
        ),
      },
      {
        accessorKey: 'toPackSize',
        header: t('label.to-pack-size'),
        size: 100,
        enableSorting: false,
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            disabled={row.onHold}
            min={1}
            updateFn={value => onUpdate(row.id, recalculateValues(row, 'toPackSize', value))}
          />
        ),
      },
      {
        accessorKey: 'toNumberOfPacks',
        header: t('label.to-number-of-packs'),
        size: 120,
        enableSorting: false,
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            disabled={row.onHold}
            min={0}
            updateFn={value =>
              onUpdate(row.id, recalculateValues(row, 'toNumberOfPacks', value))
            }
          />
        ),
      },
      {
        id: 'delete',
        header: '',
        size: 50,
        enableSorting: false,
        Cell: ({ row: { original: row } }) => (
          <IconButton
            aria-label={t('label.delete')}
            size="small"
            onClick={() => onRemove(row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      }
    );

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFromLocation, onUpdate, onRemove]);

  const table = useSimpleMaterialTable({
    tableId: 'stock-movement-lines',
    columns,
    data: lines,
    localStateOnly: true,
  });

  return <MaterialTable table={table} />;
};
