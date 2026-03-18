import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
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
  TableContainer,
} from '@openmsupply-client/common';
import { InboundLineEditForm } from './InboundLineEditForm';
import { InboundLineFragment, useDraftInboundLines } from '../../../api';
import {
  CurrencyRowFragment,
  getVolumePerPackFromVariant,
  ItemRowFragment,
  ItemVariantFragment,
  ItemVariantSelectPanel,
  useItemVariants,
} from '@openmsupply-client/system';
import { InboundLineEditCards } from './InboundLineEditCards';
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
    duplicateDraftLine,
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
  const [packRoundingMessage, setPackRoundingMessage] = useState('');
  const lastCardRef = useRef<HTMLDivElement>(null);

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

  const cards = (
    <InboundLineEditCards
      lines={draftLines}
      updateDraftLine={updateDraftLine}
      duplicateDraftLine={duplicateDraftLine}
      removeDraftLine={removeDraftLine}
      isDisabled={isDisabled}
      currency={currency}
      isExternalSupplier={isExternalSupplier}
      item={currentItem}
      hasItemVariantsEnabled={hasItemVariantsEnabled}
      hasVvmStatusesEnabled={hasVvmStatusesEnabled}
      setPackRoundingMessage={setPackRoundingMessage}
      restrictedToLocationTypeId={currentItem?.restrictedLocationTypeId}
      lastCardRef={lastCardRef}
      simplified={simplifiedTabletView}
      actions={
        <ButtonWithIcon
          disabled={isDisabled}
          color="primary"
          variant="outlined"
          onClick={handleAddBatch}
          label={`${t('label.add-batch')} (+)`}
          Icon={<PlusCircleIcon />}
        />
      }
    />
  );

  const content = (
    <>
      {simplifiedTabletView ? (
        cards
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
              item={currentItem}
              onChangeItem={setCurrentItem}
            />
            <Box sx={{ height: '5px' }} />
            <Divider />
          </Box>
          {content}
          {currentItem && (
            <ItemVariantSelectPanel
              itemId={currentItem.id}
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
