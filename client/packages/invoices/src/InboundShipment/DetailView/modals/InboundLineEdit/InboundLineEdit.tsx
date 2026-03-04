import React, { useState, useEffect, useRef } from 'react';
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
  Breakpoints,
  useAppTheme,
  useMediaQuery,
  useViewMode,
  ViewModeToggle,
} from '@openmsupply-client/common';
import { InboundLineEditForm } from './InboundLineEditForm';
import { InboundLineFragment, useDraftInboundLines } from '../../../api';
import {
  CurrencyRowFragment,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { InboundLineEditTable, QuantityTable } from './TabTables';
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
  const theme = useAppTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.lg));
  const [packRoundingMessage, setPackRoundingMessage] = useState('');
  const { viewMode, setViewMode } = useViewMode('inbound-line-edit');
  const lastCardRef = useRef<HTMLDivElement>(null);
  const prevLineCount = useRef(draftLines.length);

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  useEffect(() => {
    if (
      draftLines.length > prevLineCount.current &&
      lastCardRef.current &&
      viewMode === 'card'
    ) {
      lastCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
    prevLineCount.current = draftLines.length;
  }, [draftLines.length, viewMode]);

  const tableContent = simplifiedTabletView ? (
    <>
      <QuantityTable
        isDisabled={isDisabled}
        lines={draftLines}
        updateDraftLine={updateDraftLine}
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
    <>
      <Box
        flex={1}
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        gap={1}
      >
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <ButtonWithIcon
          disabled={isDisabled}
          color="primary"
          variant="outlined"
          onClick={() => {
            addDraftLine();
            setPackRoundingMessage('');
          }}
          label={`${t('label.add-batch')} (+)`}
          Icon={<PlusCircleIcon />}
        />
      </Box>
      <TableContainer
        sx={{
          marginTop: 2,
          ...(viewMode === 'table'
            ? {
                maxHeight: isMediumScreen ? 300 : 400,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'divider',
                borderRadius: '20px',
              }
            : {
                minHeight: 150,
              }),
        }}
      >
        <Box width="100%">
          {packRoundingMessage && (
            <Alert severity="warning" style={{ marginBottom: 2 }}>
              {packRoundingMessage}
            </Alert>
          )}
          <InboundLineEditTable
            lines={draftLines}
            updateDraftLine={updateDraftLine}
            removeDraftLine={removeDraftLine}
            isDisabled={isDisabled}
            currency={currency}
            isExternalSupplier={isExternalSupplier}
            item={currentItem}
            hasItemVariantsEnabled={hasItemVariantsEnabled}
            hasVvmStatusesEnabled={hasVvmStatusesEnabled}
            setPackRoundingMessage={setPackRoundingMessage}
            restrictedToLocationTypeId={
              currentItem?.restrictedLocationTypeId
            }
            viewMode={viewMode}
            lastCardRef={lastCardRef}
          />
        </Box>
      </TableContainer>
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
        </>
      )}
    </Modal>
  );
};
