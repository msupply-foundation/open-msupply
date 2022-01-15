import React from 'react';

import {
  DialogButton,
  Grid,
  Item,
  useDialog,
  InlineSpinner,
  Box,
  useTranslation,
  ModalMode,
  useBufferState,
} from '@openmsupply-client/common';
import { BatchesTable } from './BatchesTable';
import { ItemDetailsForm } from './ItemDetailsForm';
import {
  useDraftOutboundLines,
  usePackSizeController,
  useNextItem,
} from './hooks';
import {
  allocateQuantities,
  sumAvailableQuantity,
  getAllocatedQuantity,
} from './utils';
import { useOutboundFields, useSaveOutboundLines } from '../../api';
interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  mode: ModalMode | null;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  mode,
}) => {
  const [currentItem, setCurrentItem] = useBufferState(item);
  const t = useTranslation(['distribution']);
  const { mutate } = useSaveOutboundLines();
  const { status } = useOutboundFields('status');
  const {
    draftOutboundLines,
    updateQuantity,
    setDraftOutboundLines,
    isLoading,
  } = useDraftOutboundLines(item);
  const packSizeController = usePackSizeController(draftOutboundLines);
  const { Modal } = useDialog({ isOpen, onClose });
  const nextItem = useNextItem();

  const onNext = () => {
    setCurrentItem(nextItem);
  };

  const onAllocate = allocateQuantities(
    status,
    draftOutboundLines,
    setDraftOutboundLines
  );

  return (
    <Modal
      title={t(
        mode === ModalMode.Update ? 'heading.edit-item' : 'heading.add-item'
      )}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={mode === ModalMode.Create}
          variant="next"
          onClick={onNext}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              await mutate(draftOutboundLines);
              onClose();
            } catch (e) {
              console.log(e);
            }
          }}
        />
      }
      height={600}
      width={900}
    >
      <Grid container gap={0.5}>
        <ItemDetailsForm
          packSizeController={packSizeController}
          onChangeItem={setCurrentItem}
          item={currentItem}
          allocatedQuantity={getAllocatedQuantity(draftOutboundLines)}
          availableQuantity={sumAvailableQuantity(draftOutboundLines)}
          onChangeQuantity={onAllocate}
        />
        {!!currentItem ? (
          !isLoading ? (
            <BatchesTable
              packSizeController={packSizeController}
              onChange={updateQuantity}
              rows={draftOutboundLines}
            />
          ) : (
            <Box
              display="flex"
              flex={1}
              height={300}
              justifyContent="center"
              alignItems="center"
            >
              <InlineSpinner />
            </Box>
          )
        ) : null}
      </Grid>
    </Modal>
  );
};
