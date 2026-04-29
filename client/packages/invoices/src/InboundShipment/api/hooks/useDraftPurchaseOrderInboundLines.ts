import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  FnUtils,
  InvoiceLineNodeType,
  InvoiceLineStatusType,
  useConfirmOnLeaving,
  useNotification,
  usePreferences,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../types';
import { useDeleteInboundLines } from './line/useDeleteInboundLines';
import { mapErrorToMessageAndSetContext } from './mapErrorToMessageAndSetContext';
import { useInboundShipment } from './document/useInboundShipment';
import { useSaveInboundLines } from './utils';
import { isA } from '../../../utils';
import { PurchaseOrderLineFragment } from '@openmsupply-client/purchasing/src/purchase_order/api/operations.generated';
import { InboundLineFragment } from '../operations.generated';

export type PatchDraftLineInput = Partial<DraftInboundLine> & { id: string };

// PO line item has fewer fields than the inbound line item fragment.
// Fill in defaults for the missing fields.
const toInboundLineItem = (
  polItem: PurchaseOrderLineFragment['item']
): InboundLineFragment['item'] => ({
  ...polItem,
});

const makePurchaseOrderLineField = (pol: PurchaseOrderLineFragment) => ({
  __typename: 'PurchaseOrderLineNode' as const,
  id: pol.id,
  lineNumber: pol.lineNumber,
  adjustedNumberOfUnits: pol.adjustedNumberOfUnits ?? null,
  shippedNumberOfUnits: pol.shippedNumberOfUnits,
  inTransitNumberOfUnits: 0,
  receivedNumberOfUnits: 0,
  requestedNumberOfUnits: pol.requestedNumberOfUnits,
  pricePerPackAfterDiscount: pol.pricePerPackAfterDiscount,
});

const createDraftLine = (
  pol: PurchaseOrderLineFragment,
  invoiceId: string,
  overrides?: Partial<DraftInboundLine>
): DraftInboundLine => {
  const exchangeRate = pol.purchaseOrder?.foreignExchangeRate ?? 1;
  const costPricePerPack = pol.pricePerPackAfterDiscount * exchangeRate;

  return {
    __typename: 'InvoiceLineNode',
    id: FnUtils.generateUUID(),
    invoiceId,
    type: InvoiceLineNodeType.StockIn,
    item: toInboundLineItem(pol.item),
    itemName: pol.item.name,
    packSize: pol.requestedPackSize,
    numberOfPacks: 0,
    costPricePerPack,
    sellPricePerPack: costPricePerPack,
    totalBeforeTax: 0,
    totalAfterTax: 0,
    foreignCurrencyPriceBeforeTax: 0,
    volumePerPack: 0,
    shippedPackSize: pol.requestedPackSize,
    purchaseOrderLine: makePurchaseOrderLineField(pol),
    isCreated: true,
    ...overrides,
  };
};

export const useDraftPurchaseOrderInboundLines = (
  purchaseOrderLine: PurchaseOrderLineFragment | null
) => {
  const t = useTranslation();
  const { error } = useNotification();

  const [draftLines, setDraftLines] = useState<DraftInboundLine[]>([]);

  const { externalInboundShipmentLinesMustBeAuthorised } = usePreferences();
  const {
    query: { data },
    isExternal,
  } = useInboundShipment();
  const invoiceId = data?.id ?? '';
  const defaultStatus =
    isExternal && externalInboundShipmentLinesMustBeAuthorised
      ? InvoiceLineStatusType.Pending
      : undefined;

  // Find existing invoice lines for this PO line
  const existingLines = useMemo(() => {
    if (!data || !purchaseOrderLine) return [];
    return data.lines.nodes.filter(
      line =>
        (isA.stockInLine(line) || isA.placeholderLine(line)) &&
        line.purchaseOrderLine?.id === purchaseOrderLine.id
    );
  }, [data, purchaseOrderLine]);

  const { mutateAsync, isLoading } = useSaveInboundLines(isExternal);
  const { mutateAsync: deleteMutation } = useDeleteInboundLines(isExternal);

  const { isDirty, setIsDirty } = useConfirmOnLeaving(
    'external-inbound-line-edit'
  );

  useEffect(() => {
    if (isDirty) return;

    if (!purchaseOrderLine) {
      setDraftLines([]);
      return;
    }

    if (existingLines.length > 0) {
      // Editing existing lines for this PO line
      setDraftLines(existingLines.map(line => ({ ...line })));
    } else {
      // Creating a new line for this PO line
      const pol = purchaseOrderLine;
      const qty = pol.adjustedNumberOfUnits ?? pol.requestedNumberOfUnits;
      const shipped = pol.shippedNumberOfUnits;
      const remainingUnits = qty - shipped;
      const numberOfPacks =
        pol.requestedPackSize > 0
          ? remainingUnits / pol.requestedPackSize
          : remainingUnits;

      const exchangeRate = pol.purchaseOrder?.foreignExchangeRate ?? 1;
      const convertedPrice = pol.pricePerPackAfterDiscount * exchangeRate;

      setDraftLines([
        createDraftLine(purchaseOrderLine, invoiceId, {
          numberOfPacks,
          shippedNumberOfPacks: numberOfPacks,
          totalBeforeTax: convertedPrice * numberOfPacks,
          totalAfterTax: convertedPrice * numberOfPacks,
          foreignCurrencyPriceBeforeTax:
            pol.pricePerPackAfterDiscount * numberOfPacks,
          status: defaultStatus,
        }),
      ]);
      setIsDirty(true);
    }
  }, [existingLines, purchaseOrderLine, invoiceId, isDirty, setIsDirty]);

  const addDraftLine = useCallback(
    (initialPatch?: Partial<DraftInboundLine>) => {
      if (!purchaseOrderLine) return;
      const newLine = createDraftLine(purchaseOrderLine, invoiceId, {
        status: defaultStatus,
        ...initialPatch,
      });
      setIsDirty(true);
      setDraftLines(prev => [...prev, newLine]);
    },
    [purchaseOrderLine, invoiceId, setIsDirty, defaultStatus]
  );

  const duplicateDraftLine = useCallback(
    (lineId: string) => {
      setDraftLines(prevLines => {
        const sourceLine = prevLines.find(line => line.id === lineId);
        if (!sourceLine) return prevLines;

        const newLine: DraftInboundLine = {
          ...sourceLine,
          id: FnUtils.generateUUID(),
          numberOfPacks: 0,
          isCreated: true,
          isUpdated: false,
        };
        setIsDirty(true);
        return [...prevLines, newLine];
      });
    },
    [setIsDirty]
  );

  const updateDraftLine = useCallback(
    (patch: PatchDraftLineInput) => {
      setDraftLines(draftLines => {
        const batch = draftLines.find(line => line.id === patch.id);
        if (!batch) return draftLines;

        const newBatch = { ...batch, ...patch, isUpdated: true };
        const index = draftLines.indexOf(batch);
        draftLines[index] = newBatch;
        setIsDirty(true);
        return [...draftLines];
      });
    },
    [setDraftLines, setIsDirty]
  );

  const removeDraftLine = useCallback(
    (lineId: string) => {
      setDraftLines(prev => {
        const batch = prev.find(line => line.id === lineId);
        if (!batch) return prev;
        if (batch.isCreated) {
          return prev.filter(line => line.id !== lineId);
        }
        setIsDirty(true);
        return prev.map(line =>
          line.id === lineId ? { ...line, isDeleted: true } : line
        );
      });
    },
    [setIsDirty]
  );

  const saveLines = async () => {
    if (isDirty) {
      const linesToDelete = draftLines.filter(line => line.isDeleted);
      if (linesToDelete.length > 0) {
        const response = await deleteMutation(linesToDelete);
        linesToDelete.forEach((lineToDelete, index) => {
          const responseForLine =
            response.batchInboundShipment.deleteInboundShipmentLines?.[index];
          if (!responseForLine) {
            error(t('error.something-wrong'))();
            return;
          }
          const errorMessage = mapErrorToMessageAndSetContext(
            responseForLine,
            [lineToDelete],
            t
          );
          if (errorMessage) error(errorMessage)();
        });
      }

      const linesToSave = draftLines.filter(line => !line.isDeleted);
      if (linesToSave.length > 0) {
        const { errorMessage } = await mutateAsync(linesToSave);
        if (errorMessage) throw new Error(errorMessage);
      }

      setIsDirty(false);
    }
  };

  return {
    draftLines: draftLines.filter(line => !line.isDeleted),
    addDraftLine,
    duplicateDraftLine,
    updateDraftLine,
    removeDraftLine,
    isLoading,
    saveLines,
  };
};
