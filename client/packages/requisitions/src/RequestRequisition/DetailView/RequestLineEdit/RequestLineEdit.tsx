import React from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
} from '@openmsupply-client/common';
import { ItemRowWithStatsFragment } from '@openmsupply-client/system';
import { RequestLineEditForm } from './RequestLineEditForm';
import { useIsRequestDisabled } from '../../api';
import { useNextRequestLine, useDraftRequisitionLine } from './hooks';
import { StockDistribution } from './ItemCharts/StockDistribution';

interface RequestLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode | null;
  item: ItemRowWithStatsFragment | null;
}

export const RequestLineEdit = ({
  isOpen,
  onClose,
  mode,
  item,
}: RequestLineEditProps) => {
  const disabled = useIsRequestDisabled();
  const { Modal } = useDialog({ onClose, isOpen });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const { draft, isLoading, save, update } =
    useDraftRequisitionLine(currentItem);
  const { next, hasNext } = useNextRequestLine(currentItem);

  return (
    <Modal
      title={''}
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={!hasNext || mode === ModalMode.Create}
          variant="next"
          onClick={() => {
            next && setCurrentItem(next);
            // Returning true here triggers the slide animation
            return true;
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            await save();
            onClose();
          }}
        />
      }
      height={600}
      width={1024}
    >
      {!isLoading ? (
        <>
          <RequestLineEditForm
            draftLine={draft}
            update={update}
            disabled={mode === ModalMode.Update || disabled}
            onChangeItem={setCurrentItem}
            item={currentItem}
          />
          <StockDistribution
            availableStockOnHand={draft?.itemStats?.availableStockOnHand}
            averageMonthlyConsumption={
              draft?.itemStats?.averageMonthlyConsumption
            }
            suggestedQuantity={draft?.suggestedQuantity}
          />
        </>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
