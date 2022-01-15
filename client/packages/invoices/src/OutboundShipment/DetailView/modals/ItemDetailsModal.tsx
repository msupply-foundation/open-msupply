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
import { OutboundShipment } from '../../../types';
import {
  useDraftOutboundLines,
  usePackSizeController,
  useNextItem,
} from './hooks';
import {
  allocateQuantities,
  issueStock,
  sumAvailableQuantity,
  getAllocatedQuantity,
} from './utils';
interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: OutboundShipment;
  item: Item | null;
  mode: ModalMode | null;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  draft,
  item,
  mode,
}) => {
  const [currentItem, setCurrentItem] = useBufferState(item);
  const t = useTranslation(['distribution']);

  const { draftOutboundLines, setDraftOutboundLines, isLoading } =
    useDraftOutboundLines(item);
  const packSizeController = usePackSizeController(draftOutboundLines);
  const { Modal } = useDialog({ isOpen, onClose });
  const nextItem = useNextItem();
  const onChangeRowQuantity = (batchId: string, value: number) => {
    setDraftOutboundLines(issueStock(draftOutboundLines, batchId, value));
  };

  const onNext = () => {
    setCurrentItem(nextItem);
  };

  const onAllocate = allocateQuantities(
    draft,
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
      okButton={<DialogButton variant="ok" onClick={onClose} />}
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
              onChange={onChangeRowQuantity}
              rows={draftOutboundLines}
              invoiceStatus={draft.status}
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
