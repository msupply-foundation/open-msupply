import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  Alert,
  Divider,
  useTranslation,
  BasicSpinner,
  DialogButton,
  useDialog,
  useNotification,
  useDisabledNotificationToast,
  InvoiceLineStatusType,
  ModalMode,
  useSimplifiedTabletUI,
  Box,
  ButtonWithIcon,
  PlusCircleIcon,
  TableContainer,
  PurchaseOrderLineStatusNode,
} from '@openmsupply-client/common';
import { InboundLineEditForm } from './InboundLineEditForm';
import {
  InboundLineFragment,
  useInboundShipment,
  useDraftInboundLines,
  useDraftPurchaseOrderInboundLines,
} from '../../../api';
import {
  CurrencyRowFragment,
  getVolumePerPackFromVariant,
  ItemRowFragment,
  ItemVariantFragment,
  ItemVariantSelectPanel,
  useItemVariants,
} from '@openmsupply-client/system';
import { InboundLineEditCards } from './InboundLineEditCards';
import { isA, isInboundPlaceholderRow } from '../../../../utils';
import { ScannedBatchData } from '../../DetailView';
import { useNextItem } from '../../../../useNextItem';
import { PurchaseOrderLineFragment } from '@openmsupply-client/purchasing/src/purchase_order/api/operations.generated';
import { usePurchaseOrder } from '@openmsupply-client/purchasing/src/purchase_order/api';

type InboundLineItem = InboundLineFragment['item'];
interface InboundLineEditProps {
  item: InboundLineItem | null;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled?: boolean;
  foreignCurrency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  hasVvmStatusesEnabled?: boolean;
  hasItemVariantsEnabled?: boolean;
  scannedBatchData?: ScannedBatchData;
  getSortedItems: () => ItemRowFragment[];
  /** For external mode: the PO line ID of the clicked invoice line */
  purchaseOrderLineId?: string | null;
  /** The specific line ID to scroll into view when the modal opens */
  scrollToLineId?: string | null;
}

export const InboundLineEdit = ({
  item,
  mode,
  isOpen,
  onClose,
  isDisabled = false,
  foreignCurrency,
  isExternalSupplier,
  hasVvmStatusesEnabled = false,
  hasItemVariantsEnabled = false,
  scannedBatchData,
  getSortedItems,
  purchaseOrderLineId,
  scrollToLineId,
}: InboundLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const {
    query: { data },
    hasVerifyPermission,
    isExternal,
  } = useInboundShipment();
  const permissionDeniedNotification = useDisabledNotificationToast(
    t('auth.permission-denied')
  );
  const purchaseOrder = data?.purchaseOrder;
  const hasPurchaseOrder = !!purchaseOrder;

  // --- PO line state (external mode) ---
  const { query: poQuery } = usePurchaseOrder(purchaseOrder?.id);
  const [selectedPOLine, setSelectedPOLine] =
    useState<PurchaseOrderLineFragment | null>(null);

  // Resolve full PO line object from the ID passed by row click
  useEffect(() => {
    if (purchaseOrderLineId && poQuery.data && !selectedPOLine) {
      const polLine = poQuery.data.lines.nodes.find(
        pol => pol.id === purchaseOrderLineId
      );
      if (polLine) setSelectedPOLine(polLine);
    }
  }, [purchaseOrderLineId, poQuery.data, selectedPOLine]);

  // Compute available (unassigned) PO lines for "next" navigation
  const availablePOLines = useMemo(() => {
    if (!hasPurchaseOrder || !poQuery.data || !data) return [];
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
  }, [hasPurchaseOrder, poQuery.data, data]);

  const nextPOLine = useMemo(() => {
    if (!selectedPOLine || availablePOLines.length === 0) return null;
    const currentIndex = availablePOLines.findIndex(
      pol => pol.id === selectedPOLine.id
    );
    const nextIndex = currentIndex + 1;
    if (nextIndex >= availablePOLines.length) return null;
    return availablePOLines[nextIndex] ?? null;
  }, [selectedPOLine, availablePOLines]);

  // Derive the item from selected PO line (external) or props (internal)
  const currentItemFromPOLine = selectedPOLine
    ? {
        ...selectedPOLine.item,
        isVaccine: false,
        doses: 0,
        restrictedLocationTypeId: null,
      }
    : null;

  // --- Item state (internal mode) ---
  const [currentItem, setCurrentItem] = useState<ItemRowFragment | null>(item);
  const { next: nextItem, disabled: nextDisabled } = useNextItem(
    getSortedItems,
    currentItem?.id ?? ''
  );

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  // The effective item used by all child components
  const effectiveItem = hasPurchaseOrder ? currentItemFromPOLine : currentItem;

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  // Both hooks are called unconditionally (rules of hooks).
  // The inactive one receives params that make it no-op.
  const itemDraft = useDraftInboundLines(
    hasPurchaseOrder ? undefined : currentItem?.id,
    scannedBatchData
  );
  const poLineDraft = useDraftPurchaseOrderInboundLines(
    hasPurchaseOrder ? selectedPOLine : null
  );
  const {
    draftLines,
    addDraftLine,
    duplicateDraftLine,
    updateDraftLine,
    removeDraftLine,
    isLoading,
    saveLines,
  } = hasPurchaseOrder ? poLineDraft : itemDraft;

  const manualLinesWithZeroNumberOfPacks = draftLines.some(
    l => !l.linkedInvoiceId && isInboundPlaceholderRow(l)
  );
  const simplifiedTabletView = useSimplifiedTabletUI();
  const [packRoundingMessage, setPackRoundingMessage] = useState('');
  const lastCardRef = useRef<HTMLDivElement>(null);

  // --- Item variant logic (both modes) ---
  const [variantAction, setVariantAction] = useState<'add' | 'first' | null>(
    null
  );

  const { data: variantData } = useItemVariants(effectiveItem?.id ?? '');
  const hasVariants =
    hasItemVariantsEnabled && (variantData?.variants?.length ?? 0) > 0;

  const [variantShownForItem, setVariantShownForItem] = useState<string | null>(
    null
  );
  useEffect(() => {
    setVariantShownForItem(null);
  }, [effectiveItem?.id]);

  useEffect(() => {
    if (mode !== ModalMode.Create) return;
    if (!hasVariants || draftLines.length === 0) return;
    if (variantShownForItem === effectiveItem?.id) return;

    setVariantShownForItem(effectiveItem?.id ?? null);
    setVariantAction('first');
  }, [
    mode,
    hasVariants,
    draftLines.length,
    effectiveItem?.id,
    variantShownForItem,
  ]);

  const onVariantSelected = useCallback(
    (variant: ItemVariantFragment) => {
      const packSize = draftLines[0]?.item.defaultPackSize ?? 1;
      const variantPatch = {
        itemVariantId: variant.id,
        itemVariant: variant,
        manufacturer: variant.manufacturer ?? null,
        volumePerPack:
          getVolumePerPackFromVariant({
            packSize,
            itemVariant: variant,
          }) ?? 0,
      };

      if (variantAction === 'first' && draftLines.length > 0) {
        updateDraftLine({
          id: draftLines[0]!.id,
          ...variantPatch,
        });
      } else {
        addDraftLine(variantPatch);
      }
      setVariantAction(null);
    },
    [addDraftLine, updateDraftLine, draftLines, variantAction]
  );

  const handleAddBatch = useCallback(() => {
    if (hasVariants) {
      setVariantAction('add');
    } else {
      addDraftLine();
      setPackRoundingMessage('');
      setTimeout(() => {
        lastCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 0);
    }
  }, [hasVariants, addDraftLine]);

  // Check if saving these lines requires authorise permission.
  // Only lines the user actually changed (isUpdated/isCreated) matter.
  const saveNeedsAuthorise = () => {
    if (!isExternal) return false;
    return draftLines.some(line => {
      // Skip lines the user hasn't touched
      if (!line.isUpdated && !line.isCreated) return false;

      // Setting status to approved/rejected always needs authorise
      if (
        line.status === InvoiceLineStatusType.Passed ||
        line.status === InvoiceLineStatusType.Rejected
      )
        return true;

      // Editing an already-approved line needs authorise, unless
      // the user is changing it to pending
      if (!line.isCreated) {
        const original = data?.lines.nodes.find(l => l.id === line.id);
        if (original?.status === InvoiceLineStatusType.Passed) {
          return line.status !== InvoiceLineStatusType.Pending;
        }
      }

      return false;
    });
  };

  // --- Next/OK disabled logic ---
  const okNextDisabled = hasPurchaseOrder
    ? (mode === ModalMode.Update && !nextPOLine) || !selectedPOLine
    : (mode === ModalMode.Update && nextDisabled) || !currentItem;

  const okDisabled = hasPurchaseOrder
    ? !selectedPOLine ||
      draftLines.length === 0 ||
      manualLinesWithZeroNumberOfPacks
    : !currentItem || manualLinesWithZeroNumberOfPacks;

  const cards = (
    <InboundLineEditCards
      lines={draftLines}
      updateDraftLine={updateDraftLine}
      duplicateDraftLine={duplicateDraftLine}
      removeDraftLine={removeDraftLine}
      isDisabled={isDisabled}
      foreignCurrency={foreignCurrency}
      isExternalSupplier={isExternalSupplier}
      item={effectiveItem}
      hasItemVariantsEnabled={hasItemVariantsEnabled}
      hasVvmStatusesEnabled={hasVvmStatusesEnabled}
      setPackRoundingMessage={setPackRoundingMessage}
      restrictedToLocationTypeId={effectiveItem?.restrictedLocationTypeId}
      lastCardRef={lastCardRef}
      scrollToLineId={scrollToLineId}
    />
  );

  const content = (
    <>
      {simplifiedTabletView ? (
        <Box sx={{ marginTop: 2 }}>{cards}</Box>
      ) : (
        <TableContainer
          sx={{
            marginTop: 2,
            overflow: 'visible',
          }}
        >
          <Box width="100%">
            {packRoundingMessage && (
              <Alert severity="warning" style={{ marginBottom: 2 }}>
                {packRoundingMessage}
              </Alert>
            )}
            {cards}
          </Box>
        </TableContainer>
      )}
    </>
  );

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      headerActions={
        <ButtonWithIcon
          disabled={isDisabled}
          color="primary"
          variant="outlined"
          onClick={handleAddBatch}
          label={t('label.add-batch')}
          Icon={<PlusCircleIcon />}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          variant="next-and-ok"
          disabled={okNextDisabled || manualLinesWithZeroNumberOfPacks}
          onClick={async () => {
            if (saveNeedsAuthorise() && !hasVerifyPermission) {
              permissionDeniedNotification();
              return;
            }
            await saveLines();
            if (hasPurchaseOrder) {
              if (mode === ModalMode.Update && nextPOLine) {
                setSelectedPOLine(nextPOLine);
              } else if (mode === ModalMode.Create) {
                setSelectedPOLine(null);
              } else {
                onClose();
              }
            } else {
              if (mode === ModalMode.Update && nextItem) {
                setCurrentItem(nextItem);
              } else if (mode === ModalMode.Create) setCurrentItem(null);
              else onClose();
            }
            // Returning true here triggers the slide animation
            return true;
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          disabled={okDisabled}
          onClick={async () => {
            if (saveNeedsAuthorise() && !hasVerifyPermission) {
              permissionDeniedNotification();
              return;
            }
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
      contentProps={{ sx: { overflow: 'visible' } }}
      enableAutocomplete /* Required for previously entered batches to be remembered and suggested in future shipments */
    >
      {isLoading ? (
        <BasicSpinner messageKey="saving" />
      ) : (
        <>
          <Box
            sx={{
              position: 'sticky',
              top: '-20px',
              zIndex: 3,
              backgroundColor: 'background.paper',
              mx: '-24px',
              px: '24px',
              mt: '-20px',
              pt: '20px',
            }}
          >
            <InboundLineEditForm
              disabled={mode === ModalMode.Update}
              item={effectiveItem}
              onChangeItem={setCurrentItem}
              hasPurchaseOrder={hasPurchaseOrder}
              selectedPOLine={selectedPOLine}
              onChangePOLine={setSelectedPOLine}
            />
            <Box sx={{ height: '5px' }} />
            <Divider />
          </Box>
          {(hasPurchaseOrder ? selectedPOLine : true) && content}
          {effectiveItem && (
            <ItemVariantSelectPanel
              itemId={effectiveItem.id}
              open={variantAction !== null}
              onClose={() => setVariantAction(null)}
              onSelect={onVariantSelected}
              onManual={() => {
                if (variantAction === 'add') {
                  addDraftLine();
                  setPackRoundingMessage('');
                  setTimeout(() => {
                    lastCardRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                    });
                  }, 0);
                }
                setVariantAction(null);
              }}
            />
          )}
        </>
      )}
    </Modal>
  );
};
