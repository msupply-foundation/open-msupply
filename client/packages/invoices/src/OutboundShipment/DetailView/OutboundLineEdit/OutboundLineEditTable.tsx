import React, { useCallback, useMemo } from 'react';
import { MRT_ShowHideColumnsButton } from 'material-react-table';
import {
  Divider,
  Box,
  useTranslation,
  useFormatNumber,
  Tooltip,
  NumUtils,
  Typography,
  usePreferences,
  MaterialTable,
  useSimpleMaterialTable,
  DateUtils,
  useShallow,
} from '@openmsupply-client/common';
import { useOutboundLineEditColumns } from './columns';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import {
  AllocateInType,
  useAllocationContext,
  getAllocatedQuantity,
  DraftStockOutLineFragment,
} from '../../../StockOut';
import {
  UsePluginEvents,
  ShipmentLinePluginState,
} from '@openmsupply-client/common';

export interface OutboundLineEditTableProps {
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
  pluginEvents: UsePluginEvents<ShipmentLinePluginState>;
}

const compactTableContainerSx = {
  flex: 1,
  minHeight: 0,
  overflowX: 'auto',
  overflowY: 'auto',
  '& .MuiTableBody-root .MuiTableRow-root': {
    minHeight: '30px',
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    paddingTop: '0.1rem',
    paddingBottom: '0.1rem',
  },
  '& .MuiInputBase-root.MuiInput-root': {
    minHeight: '32px',
  },
  '& .MuiPickersOutlinedInput-root': {
    height: '32px',
  },
} as const;

export const OutboundLineEditTable = ({
  currency,
  isExternalSupplier,
  pluginEvents,
}: OutboundLineEditTableProps) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const prefs = usePreferences();

  const {
    draftLines,
    placeholderQuantity,
    nonAllocatableLines,
    allocateIn,
    allocatedQuantity,
    item,
    manualAllocate,
    setVvmStatus,
    setReceivedNumberOfPacks,
    setReasonOption,
  } = useAllocationContext(
    useShallow(state => {
      const { placeholderUnits, item, allocateIn } = state;

      const inDoses = allocateIn.type === AllocateInType.Doses;
      return {
        draftLines: state.draftLines,
        nonAllocatableLines: state.nonAllocatableLines,
        allocateIn,
        item,
        manualAllocate: state.manualAllocate,
        setVvmStatus: state.setVvmStatus,
        setReceivedNumberOfPacks: state.setReceivedNumberOfPacks,
        setReasonOption: state.setReasonOption,
        // In packs & units: we show totals in units
        // In doses: we show totals in doses
        allocatedQuantity: getAllocatedQuantity({
          draftLines: state.draftLines,
          allocateIn: inDoses ? allocateIn : { type: AllocateInType.Units },
        }),
        placeholderQuantity:
          placeholderUnits !== null && inDoses
            ? (placeholderUnits ?? 0) * (item?.doses || 1)
            : placeholderUnits,
      };
    })
  );

  const getIsDisabled = useCallback(
    (row: DraftStockOutLineFragment) => {
      if (nonAllocatableLines.some(line => line.id === row.id)) return true;

      // For Outbound Shipments, we also don't allow allocating bad VVM status
      // stock
      if (
        prefs.manageVvmStatusForStock &&
        item?.isVaccine &&
        !!row.vvmStatus?.unusable
      )
        return true;

      // Prevent issuing expired stock if preference is set, up to threshold
      if (prefs.expiredStockPreventIssue && !!row.expiryDate) {
        const threshold = prefs.expiredStockIssueThreshold ?? 0;
        const daysBeforeExpiry = DateUtils.differenceInDays(
          row.expiryDate,
          Date.now()
        );
        if (daysBeforeExpiry <= threshold) return true;
      }

      return false;
    },
    [nonAllocatableLines, prefs, item]
  );

  const allocate = (
    key: string,
    value: number,
    options?: {
      allocateInType?: AllocateInType;
      preventPartialPacks?: boolean;
    }
  ) => {
    const num = Number.isNaN(value) ? 0 : value;
    return manualAllocate(key, num, format, t, options);
  };

  const columns = useOutboundLineEditColumns({
    allocate,
    item,
    currency,
    isExternalSupplier,
    allocateIn: allocateIn,
    setVvmStatus,
    setReceivedNumberOfPacks,
    setReasonOption,
    pluginEvents,
    getIsDisabled,
  });

  // Display all stock lines to user, including non-allocatable ones at the bottom
  const lines = useMemo(
    () => [...draftLines, ...nonAllocatableLines],
    [draftLines, nonAllocatableLines]
  );

  const table = useSimpleMaterialTable<DraftStockOutLineFragment>({
    tableId: 'outbound-line-edit',
    columns,
    data: lines,
    // Modal table state should not be synced to URL (would otherwise clobber
    // the parent detail view's sort/filter URL params on open/close).
    localStateOnly: true,
    getIsRestrictedRow: row => getIsDisabled(row.original),
    enableBottomToolbar: false,
    muiTablePaperProps: {
      sx: {
        width: '100%',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        '& > .MuiBox-root': { minHeight: '2.5rem', height: 'unset' },
        '& > .MuiBox-root > .MuiBox-root': { paddingY: 0 },
        boxShadow: 'none',
      },
    },
    muiTableContainerProps: {
      sx: compactTableContainerSx,
    },
    renderEmptyRowsFallback: () => (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    ),
  });

  return (
    <Box
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Divider margin={2} />
      {/* Table takes remaining space; rows scroll inside the MRT TableContainer */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <MaterialTable table={table} />
      </Box>
      {/* Bottom bar is a flex sibling — always visible below the table */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          justifyContent: 'space-between',
          borderTop: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
          minHeight: '32px',
        }}
      >
        <MRT_ShowHideColumnsButton table={table} />
        <PlaceholderAndTotal
          allocatedQuantity={allocatedQuantity + (placeholderQuantity ?? 0)}
          inDoses={allocateIn.type === AllocateInType.Doses}
          placeholderQuantity={
            // If no stock lines, show placeholder: 0. Otherwise don't show placeholder unless >0
            placeholderQuantity === 0 && lines.length
              ? null
              : placeholderQuantity
          }
        />
      </Box>
    </Box>
  );
};

const PlaceholderAndTotal = ({
  allocatedQuantity,
  placeholderQuantity,
  inDoses,
}: {
  allocatedQuantity: number;
  placeholderQuantity: number | null;
  inDoses: boolean;
}) => {
  const t = useTranslation();
  const formattedValue = useFormatNumber().round(allocatedQuantity, 2);
  const tooltip = useFormatNumber().round(allocatedQuantity, 10);

  return (
    <>
      {placeholderQuantity !== null && (
        <Box
          sx={{
            display: 'flex',
            gap: '10px',
            fontSize: 12,
            padding: '4px 20px 4px 12px',
            color: 'secondary.main',
          }}
        >
          {t('label.placeholder')}
          <Tooltip title={tooltip}>
            <span
              style={{
                textAlign: 'right',
                paddingRight: 20,
              }}
            >
              {placeholderQuantity}
            </span>
          </Tooltip>
        </Box>
      )}

      <div style={{ display: 'flex', gap: 20, fontWeight: 'bold' }}>
        {inDoses ? t('label.total-doses') : t('label.total-units')}
        <Tooltip title={tooltip}>
          <span
            style={{
              textAlign: 'right',
              paddingRight: 20,
            }}
          >
            {!!NumUtils.hasMoreThanTwoDp(allocatedQuantity)
              ? `${formattedValue}...`
              : formattedValue}
          </span>
        </Tooltip>
      </div>
    </>
  );
};
