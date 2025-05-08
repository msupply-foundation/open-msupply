import React, { useState } from 'react';
import {
  Typography,
  InlineSpinner,
  Box,
  useTranslation,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  DateUtils,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { AutoAllocate } from './AutoAllocate';
import { useDraftOutboundLines } from './hooks';
import { useItemInfo, useOutbound } from '../../api';
import { DraftItem } from '../../..';
import {
  PackSizeController,
  allocateQuantities,
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
} from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';
import { CurrencyRowFragment } from '@openmsupply-client/system';

interface AllocationProps {
  itemId?: string;
}

export const Allocation = ({ itemId }: AllocationProps) => {
  const { data: item } = useItemInfo(itemId);

  return item ? <AllocationInner item={item} /> : null;
};

const AllocationInner = ({ item }: { item: DraftItem }) => {
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);

  const { status, currency, otherParty } = useOutbound.document.fields([
    'status',
    'currency',
    'otherParty',
  ]);
  const {
    draftStockOutLines,
    updateQuantity,
    setDraftStockOutLines,
    isLoading,
  } = useDraftOutboundLines(item.id);
  const packSizeController = usePackSizeController(draftStockOutLines);
  const [showZeroQuantityConfirmation, setShowZeroQuantityConfirmation] =
    useState(false);

  const onUpdateQuantity = (batchId: string, quantity: number) => {
    updateQuantity(batchId, quantity);
    setIsAutoAllocated(false);
  };

  const onAllocate = (
    newVal: number,
    packSize: number | null,
    autoAllocated = false
  ) => {
    const newAllocateQuantities = allocateQuantities(
      status,
      draftStockOutLines
    )(newVal, packSize, undefined);
    setDraftStockOutLines(newAllocateQuantities ?? draftStockOutLines);
    setIsAutoAllocated(autoAllocated);
    if (showZeroQuantityConfirmation && newVal !== 0)
      setShowZeroQuantityConfirmation(false);

    return newAllocateQuantities;
  };

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
      <AutoAllocate
        packSizeController={packSizeController}
        item={item}
        allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
        availableQuantity={sumAvailableQuantity(draftStockOutLines)}
        onChangeQuantity={onAllocate}
        isAutoAllocated={isAutoAllocated}
        showZeroQuantityConfirmation={showZeroQuantityConfirmation}
        hasOnHold={hasOnHold}
        hasExpired={hasExpired}
        draftStockOutLines={draftStockOutLines}
      />

      <TableWrapper
        hasLines={hasLines}
        currentItem={item}
        isLoading={isLoading}
        packSizeController={packSizeController}
        updateQuantity={onUpdateQuantity}
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
