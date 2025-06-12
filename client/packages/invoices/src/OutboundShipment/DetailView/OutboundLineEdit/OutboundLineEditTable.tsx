import React, { useEffect, useMemo } from 'react';
import {
  Divider,
  Box,
  DataTable,
  useTranslation,
  TableCell,
  styled,
  useFormatNumber,
  Tooltip,
  NumUtils,
  Typography,
  useTableStore,
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import { useOutboundLineEditColumns } from './columns';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import {
  AllocateInType,
  useAllocationContext,
  getAllocatedQuantity,
} from '../../../StockOut';
import { min } from 'lodash';

export interface OutboundLineEditTableProps {
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const PlaceholderCell = styled(TableCell)(({ theme }) => ({
  fontSize: 12,
  padding: '4px 20px 4px 12px',
  color: theme.palette.secondary.main,
}));

const TotalCell = styled(TableCell)(({ theme }) => ({
  fontSize: 14,
  padding: '8px 12px 4px 12px',
  fontWeight: 'bold',
  position: 'sticky',
  bottom: 0,
  background: theme.palette.background.white,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const PlaceholderRow = ({
  quantity,
  extraColumnOffset,
  dosesPerUnit,
}: {
  quantity: number | null;
  extraColumnOffset: number;
  dosesPerUnit?: number;
}) => {
  const t = useTranslation();

  const formattedValue = useFormatNumber().round(quantity ?? 0, 2);

  // TODO - maybe should be editable? Can't clear when manually allocating..
  return quantity === null ? null : (
    <tr>
      <PlaceholderCell
        colSpan={5 + extraColumnOffset}
        sx={{ color: 'secondary.main' }}
      >
        {t('label.placeholder')}
      </PlaceholderCell>
      <PlaceholderCell style={{ textAlign: 'right', paddingRight: '14px' }}>
        1
      </PlaceholderCell>
      {!!dosesPerUnit && (
        <PlaceholderCell style={{ textAlign: 'right', paddingRight: '14px' }}>
          {dosesPerUnit}
        </PlaceholderCell>
      )}
      <PlaceholderCell colSpan={dosesPerUnit ? 2 : 3}></PlaceholderCell>
      <Tooltip title={quantity.toString()}>
        <PlaceholderCell style={{ textAlign: 'right' }}>
          {!!NumUtils.hasMoreThanTwoDp(quantity)
            ? `${formattedValue}...`
            : formattedValue}
        </PlaceholderCell>
      </Tooltip>
    </tr>
  );
};

const TotalRow = ({
  allocatedQuantity,
  extraColumnOffset,
}: {
  allocatedQuantity: number;
  extraColumnOffset: number;
}) => {
  const t = useTranslation();
  const formattedValue = useFormatNumber().round(allocatedQuantity, 2);

  return (
    <tr>
      <TotalCell colSpan={3}>{t('label.total-quantity')}</TotalCell>
      <TotalCell colSpan={6 + extraColumnOffset}></TotalCell>
      <Tooltip title={allocatedQuantity.toString()}>
        <TotalCell
          style={{
            textAlign: 'right',
            paddingRight: 20,
          }}
        >
          {!!NumUtils.hasMoreThanTwoDp(allocatedQuantity)
            ? `${formattedValue}...`
            : formattedValue}
        </TotalCell>
      </Tooltip>
      <TotalCell colSpan={2} />
    </tr>
  );
};

export const OutboundLineEditTable = ({
  currency,
  isExternalSupplier,
}: OutboundLineEditTableProps) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const tableStore = useTableStore();
  const { data: prefs } = usePreference(
    PreferenceKey.SortByVvmStatusThenExpiry,
    PreferenceKey.ManageVvmStatusForStock,
    PreferenceKey.AllowTrackingOfStockByDonor
  );

  const {
    draftLines,
    placeholderQuantity,
    nonAllocatableLines,
    allocateIn,
    allocatedQuantity,
    item,
    manualAllocate,
  } = useAllocationContext(state => {
    const { placeholderUnits, item, allocateIn } = state;

    const inDoses = allocateIn.type === AllocateInType.Doses;
    return {
      ...state,
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
  });

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
  });

  // Display all stock lines to user, including non-allocatable ones at the bottom
  const lines = useMemo(
    () => [...draftLines, ...nonAllocatableLines],
    [draftLines, nonAllocatableLines]
  );
  // But disable the non-allocatable ones
  useEffect(() => {
    tableStore.setDisabledRows(nonAllocatableLines.map(({ id }) => id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Null means we aren't using placeholder
  if (!lines.length && placeholderQuantity === null)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

  let extraColumnOffset = 0;
  if (
    item?.isVaccine &&
    (prefs?.manageVvmStatusForStock || prefs?.sortByVvmStatusThenExpiry)
  ) {
    extraColumnOffset += 1;
  }
  if (prefs?.allowTrackingOfStockByDonor) {
    extraColumnOffset += 1;
  }

  const additionalRows = [
    <PlaceholderRow
      // Only show a 0 placeholder if we have no stock lines to show
      quantity={
        placeholderQuantity === 0 && lines.length ? null : placeholderQuantity
      }
      extraColumnOffset={extraColumnOffset}
      dosesPerUnit={item?.doses}
      key="placeholder-row"
    />,
    <TotalRow
      key="total-row"
      allocatedQuantity={allocatedQuantity + (placeholderQuantity ?? 0)}
      extraColumnOffset={extraColumnOffset}
    />,
  ];

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        style={{
          maxHeight: min([screen.height - 570, 325]),
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <DataTable
          id="outbound-line-edit"
          columns={columns}
          data={lines}
          dense
          additionalRows={additionalRows}
          enableColumnSelection={true}
        />
      </Box>
    </Box>
  );
};
