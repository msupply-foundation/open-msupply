import React, { useEffect } from 'react';
import {
  Typography,
  InlineSpinner,
  Box,
  useTranslation,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  DateUtils,
  ModalRow,
  ModalLabel,
  Grid,
  BasicTextInput,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { AutoAllocate } from './AutoAllocate';
import { useDraftOutboundLines } from './hooks';
import { useItemInfo, useOutbound } from '../../api';
import { DraftItem } from '../../..';
import {
  PackSizeController,
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
} from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { useAllocationContext } from './allocation/useAllocationContext';

interface AllocationProps {
  itemId?: string;
}

export const Allocation = ({ itemId }: AllocationProps) => {
  const { data: item } = useItemInfo(itemId);
  // TODO... this better but uh
  const { draftStockOutLines } = useDraftOutboundLines(itemId ?? '');

  const setDraftStockOutLines = useAllocationContext(
    ({ setDraftStockOutLines }) => setDraftStockOutLines
  );

  useEffect(() => {
    setDraftStockOutLines(draftStockOutLines);
  }, [itemId, draftStockOutLines.length]);

  return item ? <AllocationInner item={item} /> : null;
};

const AllocationInner = ({ item }: { item: DraftItem }) => {
  const t = useTranslation();

  const { currency, otherParty } = useOutbound.document.fields([
    'currency',
    'otherParty',
  ]);
  //   useDraftOutboundLines(item.id);
  const { draftStockOutLines } = useAllocationContext(
    ({ draftStockOutLines }) => ({ draftStockOutLines })
  );
  const packSizeController = usePackSizeController(draftStockOutLines);

  // const onUpdateQuantity = (batchId: string, quantity: number) => {
  //   updateQuantity(batchId, quantity);
  //   setIsAutoAllocated(false);
  // };

  const hasLines = !!draftStockOutLines.length;

  const hasOnHold = draftStockOutLines.some(
    ({ stockLine }) =>
      (stockLine?.availableNumberOfPacks ?? 0) > 0 && !!stockLine?.onHold
  );
  const hasExpired = draftStockOutLines.some(
    ({ stockLine }) =>
      (stockLine?.availableNumberOfPacks ?? 0) > 0 &&
      !!stockLine?.expiryDate &&
      DateUtils.isExpired(new Date(stockLine?.expiryDate))
  );

  return (
    <>
      <ModalRow>
        <ModalLabel label="" />
        <Grid display="flex">
          <Typography
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {t('label.available-quantity', {
              number: sumAvailableQuantity(draftStockOutLines).toFixed(0),
            })}
          </Typography>
        </Grid>

        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput disabled sx={{ width: 150 }} value={item?.unitName} />
        </Grid>
      </ModalRow>

      <AutoAllocate
        packSizeController={packSizeController}
        hasOnHold={hasOnHold}
        hasExpired={hasExpired}
      />

      <TableWrapper
        hasLines={hasLines}
        currentItem={item}
        isLoading={false}
        packSizeController={packSizeController}
        updateQuantity={() => {}} // todo
        draftOutboundLines={draftStockOutLines}
        allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
        // batch={openedWith?.batch}
        batch={undefined} // Scanned batch - context?
        currency={currency}
        isExternalSupplier={!otherParty?.store}
      />
    </>
  );
};

interface TableProps {
  hasLines: boolean;
  currentItem: DraftItem;
  isLoading: boolean;
  packSizeController: PackSizeController;
  updateQuantity: (batchId: string, updateQuantity: number) => void;
  draftOutboundLines: DraftStockOutLine[];
  allocatedQuantity: number;
  batch?: string;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const TableWrapper: React.FC<TableProps> = ({
  hasLines,
  currentItem,
  isLoading,
  packSizeController,
  updateQuantity,
  draftOutboundLines,
  allocatedQuantity,
  batch,
  currency,
  isExternalSupplier,
}) => {
  const t = useTranslation();

  if (isLoading)
    return (
      <Box
        display="flex"
        flex={1}
        height={300}
        justifyContent="center"
        alignItems="center"
      >
        <InlineSpinner />
      </Box>
    );

  if (!hasLines)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <OutboundLineEditTable
        packSizeController={packSizeController}
        onChange={updateQuantity}
        rows={draftOutboundLines}
        item={currentItem}
        batch={batch}
        allocatedQuantity={allocatedQuantity}
        currency={currency}
        isExternalSupplier={isExternalSupplier}
      />
    </TableProvider>
  );
};
