import React, { useState, useEffect, useCallback } from 'react';
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
} from '@openmsupply-client/common';
import { InboundLineEditForm } from './InboundLineEditForm';
import { InboundLineFragment, useDraftInboundLines } from '../../../api';
import { TabLayout } from './TabLayout';
import {
  CurrencyRowFragment,
  getVolumePerPackFromVariant,
  ItemRowFragment,
  ItemVariantFragment,
  ItemVariantSelectPanel,
  useItemVariants,
} from '@openmsupply-client/system';
import { QuantityTable } from './TabTables';
import { isInboundPlaceholderRow } from '../../../../utils';
import { ScannedBatchData } from '../../DetailView';
import { useNextItem } from '../../../../useNextItem';

type InboundLineItem = InboundLineFragment['item'];
interface InboundLineEditProps {
  item: InboundLineItem | null;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled?: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  hasVvmStatusesEnabled?: boolean;
  hasItemVariantsEnabled?: boolean;
  scannedBatchData?: ScannedBatchData;
  getSortedItems: () => ItemRowFragment[];
}

export const InboundLineEdit = ({
  item,
  mode,
  isOpen,
  onClose,
  isDisabled = false,
  currency,
  isExternalSupplier,
  hasVvmStatusesEnabled = false,
  hasItemVariantsEnabled = false,
  scannedBatchData,
  getSortedItems,
}: InboundLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [currentItem, setCurrentItem] = useState<ItemRowFragment | null>(item);
  const { next: nextItem, disabled: nextDisabled } = useNextItem(
    getSortedItems,
    currentItem?.id ?? ''
  );

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const {
    draftLines,
    addDraftLine,
    updateDraftLine,
    removeDraftLine,
    isLoading,
    saveLines,
  } = useDraftInboundLines(currentItem?.id, scannedBatchData);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;
  const manualLinesWithZeroNumberOfPacks = draftLines.some(
    // should be able to save with `0` lines if they're from a transfer
    l => !l.linkedInvoiceId && isInboundPlaceholderRow(l)
  );
  const simplifiedTabletView = useSimplifiedTabletUI();

  const [variantAction, setVariantAction] = useState<'add' | 'first' | null>(
    null
  );

  const { data: variantData } = useItemVariants(currentItem?.id ?? '');
  const hasVariants =
    hasItemVariantsEnabled && (variantData?.variants?.length ?? 0) > 0;

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  const [variantShownForItem, setVariantShownForItem] = useState<string | null>( // guard to stop panel re-opening
    null
  );
  useEffect(() => {
    setVariantShownForItem(null);
  }, [currentItem?.id]);

  useEffect(() => {
    if (!hasVariants || draftLines.length === 0) return;
    if (variantShownForItem === currentItem?.id) return;

    setVariantShownForItem(currentItem?.id ?? null);
    setVariantAction('first');
  }, [hasVariants, draftLines.length, currentItem?.id, variantShownForItem]);

  const onVariantSelected = useCallback(
    (variant: ItemVariantFragment) => {
      const packSize = draftLines[0]?.packSize ?? 1;
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
    }
  }, [hasVariants, addDraftLine]);

  const tableContent = simplifiedTabletView ? (
    <>
      <QuantityTable
        isDisabled={isDisabled}
        lines={draftLines}
        updateDraftLine={updateDraftLine}
        removeDraftLine={removeDraftLine}
        item={currentItem}
        hasVvmStatusesEnabled={hasVvmStatusesEnabled}
      />
      <Box flex={1} justifyContent="flex-start" display="flex" margin={3}>
        <ButtonWithIcon
          disabled={isDisabled}
          color="primary"
          variant="outlined"
          onClick={handleAddBatch}
          label={`${t('label.add-batch')} (+)`}
          Icon={<PlusCircleIcon />}
        />
      </Box>
    </>
  ) : (
    <TabLayout
      draftLines={draftLines}
      addDraftLine={handleAddBatch}
      updateDraftLine={updateDraftLine}
      removeDraftLine={removeDraftLine}
      isDisabled={isDisabled}
      currency={currency}
      isExternalSupplier={isExternalSupplier}
      item={currentItem}
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
            if (mode === ModalMode.Update && nextItem) {
              setCurrentItem(nextItem);
            } else if (mode === ModalMode.Create) setCurrentItem(null);
            else onClose();
            // Returning true here triggers the slide animation
            return true;
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          disabled={!currentItem || manualLinesWithZeroNumberOfPacks}
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
      enableAutocomplete /* Required for previously entered batches to be remembered and suggested in future shipments */
    >
      {isLoading ? (
        <BasicSpinner messageKey="saving" />
      ) : (
        <>
          <InboundLineEditForm
            disabled={mode === ModalMode.Update}
            item={currentItem}
            onChangeItem={setCurrentItem}
          />
          <Divider margin={5} />
          {tableContent}
          {currentItem && (
            <ItemVariantSelectPanel
              itemId={currentItem.id}
              open={variantAction !== null}
              onClose={() => setVariantAction(null)}
              onSelect={onVariantSelected}
              onManual={() => {
                if (variantAction === 'add') {
                  addDraftLine();
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
