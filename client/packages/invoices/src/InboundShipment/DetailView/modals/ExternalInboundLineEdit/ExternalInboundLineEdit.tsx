import React, { useEffect, useMemo, useState } from 'react';
import {
  Divider,
  useTranslation,
  BasicSpinner,
  DialogButton,
  useDialog,
  useNotification,
  ModalMode,
  useSimplifiedTabletUI,
  Box,
  ButtonWithIcon,
  PlusCircleIcon,
  PurchaseOrderLineStatusNode,
} from '@openmsupply-client/common';
import { PurchaseOrderLineSelect } from './PurchaseOrderLineSelect';
import {
  useDraftExternalInboundLines,
  PatchDraftLineInput,
} from './useDraftExternalInboundLines';
import { TabLayout } from '../InboundLineEdit/TabLayout';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { QuantityTable } from '../InboundLineEdit/TabTables';
import { isInboundPlaceholderRow, isA } from '../../../../utils';
import { PurchaseOrderLineFragment } from '@openmsupply-client/purchasing/src/purchase_order/api/operations.generated';
import { InboundLineFragment, useInboundShipment } from '../../../api';
import { usePurchaseOrder } from '@openmsupply-client/purchasing/src/purchase_order/api';

interface ExternalInboundLineEditProps {
  item: InboundLineFragment['item'] | null;
  /** The purchase order line ID of the clicked invoice line (for edit mode) */
  purchaseOrderLineId: string | null;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled?: boolean;
  currency?: CurrencyRowFragment | null;
  hasVvmStatusesEnabled?: boolean;
  hasItemVariantsEnabled?: boolean;
}

// REVIEW: A lot of this can be cleaned up when we make the new inbound shipment/ise edit view so I didn't put much effort in
export const ExternalInboundLineEdit = ({
  purchaseOrderLineId,
  mode,
  isOpen,
  onClose,
  isDisabled = false,
  currency,
  hasVvmStatusesEnabled = false,
  hasItemVariantsEnabled = false,
}: ExternalInboundLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [selectedPOLine, setSelectedPOLine] =
    useState<PurchaseOrderLineFragment | null>(null);

  const {
    query: { data },
  } = useInboundShipment();
  const purchaseOrder = data?.purchaseOrder;
  const { query: poQuery } = usePurchaseOrder(purchaseOrder?.id);

  // In Update mode, resolve the full PO line object from the ID passed by the row click
  useEffect(() => {
    if (purchaseOrderLineId && poQuery.data && !selectedPOLine) {
      const polLine = poQuery.data.lines.nodes.find(
        pol => pol.id === purchaseOrderLineId
      );
      if (polLine) setSelectedPOLine(polLine);
    }
  }, [purchaseOrderLineId, poQuery.data, selectedPOLine]);

  // Compute available (unassigned) PO lines for the "next" button
  const availablePOLines = useMemo(() => {
    if (!poQuery.data || !data) return [];

    const existingPolIds = new Set(
      data.lines.nodes
        .filter(isA.stockInLine)
        .map(line => line.purchaseOrderLine?.id)
        .filter(Boolean)
    );

    return poQuery.data.lines.nodes.filter(
      pol =>
        pol.status !== PurchaseOrderLineStatusNode.Closed &&
        !existingPolIds.has(pol.id)
    );
  }, [poQuery.data, data]);

  const nextPOLine = useMemo(() => {
    if (!selectedPOLine || availablePOLines.length === 0) return null;
    const currentIndex = availablePOLines.findIndex(
      pol => pol.id === selectedPOLine.id
    );
    const nextIndex = currentIndex + 1;
    if (nextIndex >= availablePOLines.length) return null;
    return availablePOLines[nextIndex] ?? null;
  }, [selectedPOLine, availablePOLines]);

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const {
    draftLines,
    addDraftLine,
    updateDraftLine,
    removeDraftLine,
    isLoading,
    saveLines,
  } = useDraftExternalInboundLines(selectedPOLine);

  const manualLinesWithZeroNumberOfPacks = draftLines.some(
    l => !l.linkedInvoiceId && isInboundPlaceholderRow(l)
  );
  const simplifiedTabletView = useSimplifiedTabletUI();

  // Derive the item from the selected PO line for the table components.
  // PO line item has fewer fields than ItemRowFragment, so we fill defaults.
  const currentItem = selectedPOLine
    ? {
        ...selectedPOLine.item,
        isVaccine: false,
        doses: 0,
        restrictedLocationTypeId: null,
      }
    : null;

  const okNextDisabled =
    (mode === ModalMode.Update && !nextPOLine) || !selectedPOLine;

  const tableContent = simplifiedTabletView ? (
    <>
      <QuantityTable
        isDisabled={isDisabled}
        lines={draftLines}
        updateDraftLine={
          updateDraftLine as (patch: PatchDraftLineInput) => void
        }
        removeDraftLine={removeDraftLine}
        item={currentItem}
        hasItemVariantsEnabled={hasItemVariantsEnabled}
        hasVvmStatusesEnabled={hasVvmStatusesEnabled}
      />
      <Box flex={1} justifyContent="flex-start" display="flex" margin={3}>
        <ButtonWithIcon
          disabled={isDisabled}
          color="primary"
          variant="outlined"
          onClick={addDraftLine}
          label={`${t('label.add-batch')} (+)`}
          Icon={<PlusCircleIcon />}
        />
      </Box>
    </>
  ) : (
    <TabLayout
      draftLines={draftLines}
      addDraftLine={addDraftLine}
      updateDraftLine={
        updateDraftLine as (patch: PatchDraftLineInput) => void
      }
      removeDraftLine={removeDraftLine}
      isDisabled={isDisabled}
      currency={currency}
      isExternalSupplier
      item={currentItem}
      hasItemVariantsEnabled={hasItemVariantsEnabled}
      hasVvmStatusesEnabled={!!hasVvmStatusesEnabled}
    />
  );

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          variant="next-and-ok"
          disabled={okNextDisabled || manualLinesWithZeroNumberOfPacks}
          onClick={async () => {
            await saveLines();
            if (mode === ModalMode.Update && nextPOLine) {
              setSelectedPOLine(nextPOLine);
            } else if (mode === ModalMode.Create) {
              setSelectedPOLine(null);
            } else {
              onClose();
            }
            return true;
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          disabled={
            !selectedPOLine ||
            draftLines.length === 0 ||
            manualLinesWithZeroNumberOfPacks
          }
          onClick={async () => {
            try {
              await saveLines();
              onClose();
            } catch (e) {
              error((e as Error).message)();
            }
          }}
        />
      }
      height={700}
      width={1200}
      enableAutocomplete
    >
      {isLoading ? (
        <BasicSpinner messageKey="saving" />
      ) : (
        <>
          <PurchaseOrderLineSelect
            disabled={mode === ModalMode.Update}
            selectedLine={selectedPOLine}
            onChange={setSelectedPOLine}
          />
          <Divider margin={5} />
          {selectedPOLine && tableContent}
        </>
      )}
    </Modal>
  );
};
