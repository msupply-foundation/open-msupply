import React from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
  Box,
  useKeyboardHeightAdjustment,
} from '@openmsupply-client/common';
import { ItemRowWithStatsFragment } from '@openmsupply-client/system';
import { RequestLineEditForm } from './RequestLineEditForm';
import { useRequest } from '../../api';
import { useNextRequestLine, useDraftRequisitionLine } from './hooks';
import { StockDistribution } from './ItemCharts/StockDistribution';
import { ConsumptionHistory } from './ItemCharts/ConsumptionHistory';
import { StockEvolution } from './ItemCharts/StockEvolution';

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
  const disabled = useRequest.utils.isDisabled();
  const { Modal } = useDialog({ onClose, isOpen, animationTimeout: 100 });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const { draft, isLoading, save, update } =
    useDraftRequisitionLine(currentItem);
  const { next, hasNext } = useNextRequestLine(currentItem);
  const nextDisabled = (!hasNext && mode === ModalMode.Update) || !currentItem;
  const height = useKeyboardHeightAdjustment(600);

  return (
    <Modal
      title={''}
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={nextDisabled}
          variant="next"
          onClick={async () => {
            await save();
            if (mode === ModalMode.Update && next) setCurrentItem(next);
            else if (mode === ModalMode.Create) setCurrentItem(null);
            else onClose();
            // Returning true here triggers the slide animation
            return true;
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          disabled={!currentItem}
          onClick={async () => {
            await save();
            onClose();
          }}
        />
      }
      height={height}
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
          {!!draft && (
            <StockDistribution
              availableStockOnHand={draft?.itemStats?.availableStockOnHand}
              averageMonthlyConsumption={
                draft?.itemStats?.averageMonthlyConsumption
              }
              suggestedQuantity={draft?.suggestedQuantity}
            />
          )}
          <Box
            display="flex"
            sx={{ paddingLeft: 4, paddingRight: 4 }}
            justifyContent="space-between"
          >
            <ConsumptionHistory id={draft?.id || ''} />
            <StockEvolution id={draft?.id || ''} />
          </Box>
        </>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
