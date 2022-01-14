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
import { useBatchRows, usePackSizeController } from './hooks';
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

  const { batchRows, setBatchRows, isLoading } = useBatchRows(item);
  const packSizeController = usePackSizeController(batchRows);
  const { Modal } = useDialog({ isOpen, onClose });

  const onChangeRowQuantity = (batchId: string, value: number) => {
    setBatchRows(issueStock(batchRows, batchId, value));
  };

  const onNext = () => {};
  const onAllocate = allocateQuantities(draft, batchRows, setBatchRows);

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
          allocatedQuantity={getAllocatedQuantity(batchRows)}
          availableQuantity={sumAvailableQuantity(batchRows)}
          onChangeQuantity={onAllocate}
        />
        {!!currentItem ? (
          !isLoading ? (
            <BatchesTable
              packSizeController={packSizeController}
              onChange={onChangeRowQuantity}
              rows={batchRows}
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
