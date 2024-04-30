import React, { useEffect } from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
  Box,
  useKeyboardHeightAdjustment,
} from '@openmsupply-client/common';
import {
  ItemRowWithStatsFragment,
  usePackVariant,
} from '@openmsupply-client/system';
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
  const [previousItemLineId, setPreviousItemLineId] = useBufferState<
    string | null
  >(null);
  const { draft, isLoading, save, update } =
    useDraftRequisitionLine(currentItem);
  const { next, hasNext } = useNextRequestLine(currentItem);
  const deleteLine = useRequest.line.deleteLine();
  const isDisabled = useRequest.utils.isDisabled();

  const nextDisabled = (!hasNext && mode === ModalMode.Update) || !currentItem;
  const height = useKeyboardHeightAdjustment(600);

  const {
    variantsControl,
    numberOfPacksFromQuantity,
    numberOfPacksToTotalQuantity,
  } = usePackVariant(item?.id ?? '', item?.name ?? null);

  const deletePreviousLine = () => {
    if (previousItemLineId && !isDisabled) deleteLine(previousItemLineId);
  };
  const onChangeItem = (item: ItemRowWithStatsFragment) => {
    deletePreviousLine();
    setCurrentItem(item);
  };

  const onCancel = () => {
    if (mode === ModalMode.Create) {
      deletePreviousLine();
    }
    onClose();
  };

  useEffect(() => {
    // isCreated is true when the line exists only locally i.e. not saved to server
    if (!!draft?.isCreated) {
      save();
    } else {
      if (!!draft?.id) setPreviousItemLineId(draft.id);
    }
  }, [draft]);

  return (
    <Modal
      title={''}
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
      nextButton={
        <DialogButton
          disabled={nextDisabled}
          variant="next"
          onClick={async () => {
            await save();
            setPreviousItemLineId(null);
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
            onChangeItem={onChangeItem}
            currentItem={currentItem}
            variantsControl={variantsControl}
            numberOfPacksFromQuantity={numberOfPacksFromQuantity}
            numberOfPacksToTotalQuantity={numberOfPacksToTotalQuantity}
          />
          {!!draft && (
            <StockDistribution
              availableStockOnHand={numberOfPacksFromQuantity(
                draft?.itemStats?.availableStockOnHand
              )}
              averageMonthlyConsumption={numberOfPacksFromQuantity(
                draft?.itemStats?.averageMonthlyConsumption
              )}
              suggestedQuantity={numberOfPacksFromQuantity(
                draft?.suggestedQuantity
              )}
            />
          )}
          <Box
            display="flex"
            sx={{ paddingLeft: 4, paddingRight: 4 }}
            justifyContent="space-between"
          >
            {draft?.isCreated ? (
              <Box display="flex" height={289} />
            ) : (
              <>
                <ConsumptionHistory
                  id={draft?.id || ''}
                  numberOfPacksFromQuantity={numberOfPacksFromQuantity}
                />
                <StockEvolution
                  id={draft?.id || ''}
                  numberOfPacksFromQuantity={numberOfPacksFromQuantity}
                />
              </>
            )}
          </Box>
        </>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
