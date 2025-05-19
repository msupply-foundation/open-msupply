import { FnUtils, NumUtils } from '@common/utils';
import { DraftStockOutLine } from '../types';
import { InvoiceLineNodeType, InvoiceNodeStatus } from '@common/types';
import {
  PartialStockLineFragment,
  StockOutLineFragment,
} from './operations.generated';
import { LocaleKey, TypedTFunction } from '@common/intl';
import React from 'react';
import { StockOutAlert } from './Components';

export const createStockOutPlaceholderRow = (
  invoiceId: string,
  itemId: string,
  id = FnUtils.generateUUID()
): DraftStockOutLine => ({
  __typename: 'InvoiceLineNode',
  batch: '',
  id,
  packSize: 1,
  sellPricePerPack: 0,
  costPricePerPack: 0,
  numberOfPacks: 0,
  prescribedQuantity: 0,
  isCreated: true,
  isUpdated: false,
  invoiceId,
  totalAfterTax: 0,
  totalBeforeTax: 0,
  expiryDate: undefined,
  type: InvoiceLineNodeType.UnallocatedStock,
  item: {
    id: itemId,
    code: '',
    name: '',
    isVaccine: false,
    doses: 0,
    __typename: 'ItemNode',
  },
  itemName: '',
});

export interface DraftStockOutLineSeeds {
  invoiceId: string;
  invoiceLine: StockOutLineFragment;
  invoiceStatus: InvoiceNodeStatus;
  stockLine?: PartialStockLineFragment; // If this is not provided, the stock line from the invoice line will be used
}

export const createDraftStockOutLine = ({
  invoiceLine,
  stockLine,
  invoiceStatus,
}: DraftStockOutLineSeeds): DraftStockOutLine => {
  // When creating a draft stock out line from an invoice line we may need to adjust the available and total number of packs
  // This is because, once an invoice line is created (even in New Status), the available number of packs is reduced by the number of packs in the invoice line
  // After it is in picked status, the total number of packs is also reduced by the number of packs in the invoice line
  // Other statuses such as Shipped shouldn't show the stock line as available, so we don't need to adjust the available number of packs
  // If the invoice is New, no adjustments are needed, as the stockLines shouldn't be updated yet

  const adjustTotalNumberOfPacks = invoiceStatus === InvoiceNodeStatus.Picked;

  // Note to future self, the stockLine spread here is important, if not spread you'll be modifying the passed in data which can affect the tanStack Query Cache, with unintended effects!
  const adjustedStockLine = stockLine
    ? { ...stockLine }
    : invoiceLine?.stockLine
      ? { ...invoiceLine?.stockLine }
      : undefined;
  if (!!adjustedStockLine) {
    adjustedStockLine.availableNumberOfPacks =
      adjustedStockLine.availableNumberOfPacks + invoiceLine.numberOfPacks;
    adjustedStockLine.totalNumberOfPacks = adjustTotalNumberOfPacks
      ? adjustedStockLine.totalNumberOfPacks + invoiceLine.numberOfPacks
      : adjustedStockLine.totalNumberOfPacks;
  }

  const draftStockOutLine = {
    isCreated: !invoiceLine,
    isUpdated: false,
    ...invoiceLine,
    ...(adjustedStockLine
      ? {
          stockLine: {
            ...adjustedStockLine,
          },
        }
      : {}),
  };
  return draftStockOutLine;
};

export interface UseDraftStockOutLinesControl {
  draftStockOutLines: DraftStockOutLine[];
  updateQuantity: (batchId: string, quantity: number) => void;
  isLoading: boolean;
  setDraftStockOutLines: React.Dispatch<
    React.SetStateAction<DraftStockOutLine[]>
  >;
}

export const sumAvailableQuantity = (
  draftStockOutLines: DraftStockOutLine[]
) => {
  const sum = draftStockOutLines.reduce(
    (acc, { stockLine, packSize, location }) =>
      !location?.onHold && !stockLine?.onHold
        ? acc + (stockLine?.availableNumberOfPacks ?? 0) * packSize
        : acc,
    0
  );

  return sum;
};

export const getAllocatedQuantity = (draftStockOutLines: DraftStockOutLine[]) =>
  NumUtils.round(
    draftStockOutLines.reduce(
      (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
      0
    ),
    3
  );

export const getAllocationAlerts = (
  requestedQuantity: number,
  allocatedQuantity: number,
  placeholderQuantity: number,
  hasOnHold: boolean,
  hasExpired: boolean,
  format: (value: number, options?: Intl.NumberFormatOptions) => string,
  t: TypedTFunction<LocaleKey>
) => {
  const alerts: StockOutAlert[] = [];

  const unavailableStockWarning = `${
    hasOnHold ? t('messages.stock-on-hold') : ''
  } ${hasExpired ? t('messages.stock-expired') : ''}`.trim();

  if (unavailableStockWarning && requestedQuantity > 0) {
    alerts.push({
      message: unavailableStockWarning,
      severity: 'info',
    });
  }

  if (allocatedQuantity !== requestedQuantity && allocatedQuantity > 0) {
    alerts.push({
      message: t('messages.over-allocated', {
        quantity: format(allocatedQuantity),
        issueQuantity: format(requestedQuantity),
      }),
      severity: 'warning',
    });
    return alerts;
  }
  if (placeholderQuantity > 0) {
    alerts.push({
      message: t('messages.placeholder-allocated', { placeholderQuantity }),
      severity: 'info',
    });
  }

  return alerts;
};
