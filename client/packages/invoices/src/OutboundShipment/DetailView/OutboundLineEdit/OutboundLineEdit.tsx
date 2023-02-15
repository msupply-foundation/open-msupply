import React from 'react';
import {
  Typography,
  DialogButton,
  Grid,
  useDialog,
  InlineSpinner,
  Box,
  useTranslation,
  ModalMode,
  useBufferState,
  useDirtyCheck,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  useKeyboardHeightAdjustment,
  InvoiceLineNodeType,
  useNotification,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { OutboundLineEditForm } from './OutboundLineEditForm';
import {
  useDraftOutboundLines,
  usePackSizeController,
  useNextItem,
  PackSizeController,
} from './hooks';
import {
  allocateQuantities,
  sumAvailableQuantity,
  getAllocatedQuantity,
  getAllocatedPacks,
} from './utils';
import { useOutbound } from '../../api';
import { DraftOutboundLine } from '../../../types';

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemRowFragment | null;
  mode: ModalMode | null;
}

export const OutboundLineEdit: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  mode,
}) => {
  const t = useTranslation(['distribution']);
  const { info } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const [currentItem, setCurrentItem] = useBufferState(item);

  const { mutate } = useOutbound.line.save();
  const { status } = useOutbound.document.fields('status');
  const isDisabled = useOutbound.utils.isDisabled();
  const {
    draftOutboundLines,
    updateQuantity,
    setDraftOutboundLines,
    isLoading,
  } = useDraftOutboundLines(currentItem);
  const packSizeController = usePackSizeController(draftOutboundLines);
  const { next, disabled: nextDisabled } = useNextItem(currentItem?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const height = useKeyboardHeightAdjustment(700);
  const placeholder = draftOutboundLines?.find(
    ({ type, numberOfPacks }) =>
      type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks !== 0
  );

  const onNext = async () => {
    if (isDirty) await mutate(draftOutboundLines);
    if (!!placeholder) {
      const infoSnack = info(t('message.placeholder-line'));
      infoSnack();
    }
    if (mode === ModalMode.Update && next) setCurrentItem(next);
    else if (mode === ModalMode.Create) setCurrentItem(null);
    else onClose();
    setIsDirty(false);
    // Returning true here triggers the slide animation
    return true;
  };

  const onAllocate = (newVal: number, packSize: number | null) => {
    const newAllocateQuantities = allocateQuantities(
      status,
      draftOutboundLines
    )(newVal, packSize);
    setIsDirty(true);
    setDraftOutboundLines(newAllocateQuantities ?? draftOutboundLines);
  };

  const canAutoAllocate = !!(currentItem && draftOutboundLines.length);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;

  return (
    <Modal
      title={t(
        mode === ModalMode.Update ? 'heading.edit-item' : 'heading.add-item'
      )}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={okNextDisabled}
          variant="next"
          onClick={onNext}
        />
      }
      okButton={
        <DialogButton
          disabled={!currentItem}
          variant="ok"
          onClick={async () => {
            try {
              if (isDirty) await mutate(draftOutboundLines);
              setIsDirty(false);
              if (!!placeholder) {
                const infoSnack = info(t('message.placeholder-line'));
                infoSnack();
              }
              onClose();
            } catch (e) {
              // console.log(e);
            }
          }}
        />
      }
      height={height}
      width={1000}
    >
      <Grid container gap={0.5}>
        <OutboundLineEditForm
          disabled={mode === ModalMode.Update || isDisabled}
          packSizeController={packSizeController}
          onChangeItem={setCurrentItem}
          item={currentItem}
          allocatedQuantity={getAllocatedQuantity(draftOutboundLines)}
          availableQuantity={sumAvailableQuantity(draftOutboundLines)}
          onChangeQuantity={onAllocate}
          canAutoAllocate={canAutoAllocate}
        />

        <TableWrapper
          canAutoAllocate={canAutoAllocate}
          currentItem={currentItem}
          isLoading={isLoading}
          packSizeController={packSizeController}
          updateQuantity={updateQuantity}
          draftOutboundLines={draftOutboundLines}
          allocatedQuantity={getAllocatedQuantity(draftOutboundLines)}
          allocatedPacks={getAllocatedPacks(draftOutboundLines)}
        />
      </Grid>
    </Modal>
  );
};

interface TableProps {
  canAutoAllocate: boolean;
  currentItem: ItemRowFragment | null;
  isLoading: boolean;
  packSizeController: PackSizeController;
  updateQuantity: (batchId: string, updateQuantity: number) => void;
  draftOutboundLines: DraftOutboundLine[];
  allocatedQuantity: number;
  allocatedPacks: number;
}

const TableWrapper: React.FC<TableProps> = ({
  canAutoAllocate,
  currentItem,
  isLoading,
  packSizeController,
  updateQuantity,
  draftOutboundLines,
  allocatedQuantity,
  allocatedPacks,
}) => {
  const t = useTranslation('distribution');

  if (!currentItem) return null;

  if (isLoading)
    return (
      <Box
        display="flex"
        flex={1}
        height={400}
        justifyContent="center"
        alignItems="center"
      >
        <InlineSpinner />
      </Box>
    );

  if (!canAutoAllocate)
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
        allocatedQuantity={allocatedQuantity}
        allocatedPacks={allocatedPacks}
      />
    </TableProvider>
  );
};
