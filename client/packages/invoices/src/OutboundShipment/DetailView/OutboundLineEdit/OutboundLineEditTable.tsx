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
} from '@openmsupply-client/common';
import { useOutboundLineEditColumns } from './columns';
import { DraftItem } from '../../..';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { useAllocationContext } from './allocation/useAllocationContext';
import { getAllocatedUnits } from './allocation/utils';

export interface OutboundLineEditTableProps {
  item: DraftItem;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const PlaceholderCell = styled(TableCell)(({ theme }) => ({
  fontSize: 12,
  padding: '4px 20px 4px 12px',
  color: theme.palette.secondary.main,
}));

const TotalCell = styled(TableCell)({
  fontSize: 14,
  padding: '4px 12px 4px 12px',
  fontWeight: 'bold',
});

const PlaceholderRow = ({ quantity }: { quantity: number | null }) => {
  const t = useTranslation();

  const formattedValue = useFormatNumber().round(quantity ?? 0, 2);

  // TODO - maybe should be editable? Can't clear when manually allocating..
  return quantity === null ? null : (
    <tr>
      <PlaceholderCell colSpan={3} sx={{ color: 'secondary.main' }}>
        {t('label.placeholder')}
      </PlaceholderCell>
      <PlaceholderCell
        style={{ textAlign: 'right', paddingRight: '14px' }}
        colSpan={2}
      >
        1
      </PlaceholderCell>
      <PlaceholderCell colSpan={3}></PlaceholderCell>
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

const TotalRow = ({ allocatedQuantity }: { allocatedQuantity: number }) => {
  const t = useTranslation();
  const formattedValue = useFormatNumber().round(allocatedQuantity, 2);

  return (
    <tr>
      <TotalCell colSpan={3}>{t('label.total-quantity')}</TotalCell>
      <TotalCell colSpan={5}></TotalCell>
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
    </tr>
  );
};

export const OutboundLineEditTable = ({
  item,
  currency,
  isExternalSupplier,
}: OutboundLineEditTableProps) => {
  const t = useTranslation();
  const tableStore = useTableStore();

  const {
    allocatedUnits,
    draftLines,
    placeholderQuantity,
    nonAllocatableLines,
    allocateIn,
    manualAllocate,
  } = useAllocationContext(
    ({
      draftLines,
      placeholderQuantity,
      nonAllocatableLines,
      allocateIn,
      manualAllocate,
    }) => ({
      draftLines,
      placeholderQuantity,
      allocatedUnits: getAllocatedUnits({ draftLines, placeholderQuantity }),
      nonAllocatableLines,
      allocateIn,
      manualAllocate,
    })
  );

  const allocate = (key: string, value: number) => {
    const num = Number.isNaN(value) ? 0 : value;
    manualAllocate(key, num);
  };

  const columns = useOutboundLineEditColumns({
    allocate,
    item,
    currency,
    isExternalSupplier,
    allocateIn,
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

  const additionalRows = [
    <PlaceholderRow
      // If placeholder quantity is 0, and we have lines, don't show placeholder row
      quantity={
        placeholderQuantity === 0 && lines.length ? null : placeholderQuantity
      }
      key="placeholder-row"
    />,
    <tr key="divider-row">
      <td colSpan={11}>
        <Divider margin={10} />
      </td>
    </tr>,
    <TotalRow key="total-row" allocatedQuantity={allocatedUnits} />,
  ];

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        style={{
          maxHeight: 325,
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
        />
      </Box>
    </Box>
  );
};
