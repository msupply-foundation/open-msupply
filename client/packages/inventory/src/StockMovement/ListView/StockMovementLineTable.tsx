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
import { StockMovementDraftLineFragment } from '../api';

export type DraftStockMovementLine = Omit<
  StockMovementDraftLineFragment,
  'toLocation' | '__typename'
> & {
  toLocation: LocationRowFragment | null;
};

type CalculateField = 'fromNumberOfPacks' | 'toPackSize' | 'toNumberOfPacks';

const recalculateValues = (
  line: DraftStockMovementLine,
  field: CalculateField,
  value?: number
): Partial<DraftStockMovementLine> => {
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
  lines: DraftStockMovementLine[];
  showFromLocation: boolean;
  onUpdate: (id: string, patch: Partial<DraftStockMovementLine>) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
  failedLineIds?: string[];
}

export const StockMovementLineTable = ({
  lines,
  showFromLocation,
  onUpdate,
  onRemove,
  disabled = false,
  failedLineIds = [],
}: StockMovementLineTableProps) => {
  const t = useTranslation();

  const columns = useMemo((): ColumnDef<DraftStockMovementLine>[] => {
    const cols: ColumnDef<DraftStockMovementLine>[] = [
      {
        id: 'item',
        header: t('label.item'),
        accessorFn: row => `${row.itemCode} - ${row.itemName}`,
        getIsError: row => failedLineIds.includes(row.id),
        size: 200,
        enableSorting: false,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
        enableSorting: false,
      },
      {
        id: 'expiryDate',
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry'),
        columnType: ColumnType.Date,
        size: 80,
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
        accessorFn: row => row.fromLocation?.code ?? '-',
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
            disabled={disabled || row.onHold}
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
            disabled={disabled || row.onHold}
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
            disabled={disabled || row.onHold}
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
            disabled={disabled || row.onHold}
            min={0}
            updateFn={value =>
              onUpdate(row.id, recalculateValues(row, 'toNumberOfPacks', value))
            }
          />
        ),
      }
    );

    if (onRemove) {
      cols.push({
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
      });
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFromLocation, onUpdate, onRemove, disabled, failedLineIds]);

  const table = useSimpleMaterialTable({
    tableId: 'stock-movement-lines',
    columns,
    data: lines,
    localStateOnly: true,
  });

  return <MaterialTable table={table} />;
};
