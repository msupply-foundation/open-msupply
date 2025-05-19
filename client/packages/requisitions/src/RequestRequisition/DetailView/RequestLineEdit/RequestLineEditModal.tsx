import React, { useState } from 'react';
import {
  Box,
  DialogButton,
  ModalMode,
  useBufferState,
  useDialog,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { RequestFragment } from '../../api';
import { useDraftRequisitionLine, useNextRequestLine } from './hooks';
import { StockDistribution } from './ItemCharts/StockDistribution';
import { ConsumptionHistory } from './ItemCharts/ConsumptionHistory';
import { StockEvolution } from './ItemCharts/StockEvolution';
import { isRequestDisabled } from '../../../utils';
import { RequestLineEdit } from './RequestLineEdit';
import { Representation, RepresentationValue } from './utils';

interface RequestLineEditModalProps {
  requisition: RequestFragment;
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode | null;
  store?: UserStoreNodeFragment;
}

export const RequestLineEditModalInner = ({
  requisition,
  itemId,
  isOpen,
  onClose,
  mode,
  store,
}: RequestLineEditModalProps) => {
  const isDisabled = isRequestDisabled(requisition);
  const { Modal } = useDialog({ onClose, isOpen });

  const lines = requisition?.lines.nodes.sort((a, b) =>
    a.item.name.localeCompare(b.item.name)
  );
  const [currentItem, setCurrentItem] = useBufferState(
    lines?.find(line => line.item.id === itemId)?.item
  );
  const [representation, setRepresentation] = useState<RepresentationValue>(
    Representation.UNITS
  );

  const { draft, save, update } = useDraftRequisitionLine(currentItem);
  const { hasNext, next } = useNextRequestLine(currentItem);

  const isPacksEnabled = !!currentItem?.defaultPackSize;
  const useConsumptionData =
    store?.preferences?.useConsumptionAndStockFromCustomersForInternalOrders;
  const isProgram = !!requisition?.program;
  const nextDisabled = (!hasNext && mode === ModalMode.Update) || !currentItem;

  const onCancel = () => {
    onClose();
  };

  return (
    <Modal
      title=""
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
      nextButton={
        <DialogButton
          disabled={nextDisabled}
          variant="next-and-ok"
          onClick={async () => {
            await save();
            if (mode === ModalMode.Update && next) setCurrentItem(next);
            else if (mode === ModalMode.Create) setCurrentItem(undefined);
            else onClose();
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
      height={800}
      width={1050}
    >
      <>
        <RequestLineEdit
          requisition={requisition}
          lines={lines}
          currentItem={currentItem}
          setCurrentItem={setCurrentItem}
          draft={draft}
          update={update}
          isPacksEnabled={isPacksEnabled}
          representation={representation}
          setRepresentation={setRepresentation}
          disabled={isDisabled}
          isProgram={isProgram}
          useConsumptionData={useConsumptionData}
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
          {draft?.isCreated ? (
            <Box display="flex" height={289} />
          ) : (
            <>
              <ConsumptionHistory id={draft?.id || ''} />
              <StockEvolution id={draft?.id || ''} />
            </>
          )}
        </Box>
      </>
    </Modal>
  );
};

export const RequestLineEditModal = ({
  requisition,
  itemId,
  isOpen,
  onClose,
  mode,
  store,
}: RequestLineEditModalProps) => {
  return (
    <RequestLineEditModalInner
      requisition={requisition}
      itemId={itemId}
      isOpen={isOpen}
      onClose={onClose}
      mode={mode}
      store={store}
    />
  );
};
