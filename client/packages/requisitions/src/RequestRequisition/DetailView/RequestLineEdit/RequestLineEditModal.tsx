import React, { useEffect, useMemo, useState } from 'react';
import {
  DialogButton,
  ModalMode,
  useBufferState,
  useDialog,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { RequestFragment, useRequest } from '../../api';
import { useDraftRequisitionLine, useNextRequestLine } from './hooks';
import { isRequestDisabled } from '../../../utils';
import { RequestLineEdit } from './RequestLineEdit';
import { Representation, RepresentationValue } from './utils';
import { ItemWithStatsFragment } from '@openmsupply-client/system';

interface RequestLineEditModalProps {
  store?: UserStoreNodeFragment;
  mode: ModalMode | null;
  requisition: RequestFragment;
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RequestLineEditModal = ({
  store,
  mode,
  requisition,
  itemId,
  isOpen,
  onClose,
}: RequestLineEditModalProps) => {
  const { Modal } = useDialog({ onClose, isOpen });
  const deleteLine = useRequest.line.deleteLine();
  const isDisabled = isRequestDisabled(requisition);

  const lines = useMemo(
    () =>
      requisition?.lines.nodes
        .slice()
        .sort((a, b) => a.item.name.localeCompare(b.item.name)) ?? [],
    [requisition?.lines.nodes]
  );

  const [currentItem, setCurrentItem] = useBufferState(
    lines?.find(line => line.item.id === itemId)?.item
  );
  const [previousItemLineId, setPreviousItemLineId] = useBufferState<
    string | null
  >(null);
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

  const deletePreviousLine = () => {
    if (previousItemLineId && !isDisabled) deleteLine(previousItemLineId);
  };

  const onCancel = () => {
    if (mode === ModalMode.Create) {
      deletePreviousLine();
    }
    onClose();
  };

  const onChangeItem = (item: ItemWithStatsFragment) => {
    deletePreviousLine();
    setRepresentation(Representation.UNITS);
    setCurrentItem(item);
  };

  const onSave = async () => {
    await save();
    setPreviousItemLineId(null);
    if (mode === ModalMode.Update && next) setCurrentItem(next);
    else if (mode === ModalMode.Create) setCurrentItem(undefined);
    else onClose();
  };

  useEffect(() => {
    if (!!draft?.isCreated) {
      save();
    } else {
      if (!!draft?.id) setPreviousItemLineId(draft.id);
    }
  }, [draft, setPreviousItemLineId]);

  return (
    <Modal
      title=""
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
      nextButton={
        <DialogButton
          disabled={nextDisabled}
          variant="next-and-ok"
          onClick={onSave}
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
      width={1200}
    >
      <RequestLineEdit
        requisition={requisition}
        lines={lines}
        currentItem={currentItem}
        onChangeItem={onChangeItem}
        draft={draft}
        update={update}
        isPacksEnabled={isPacksEnabled}
        representation={representation}
        setRepresentation={setRepresentation}
        disabled={isDisabled}
        isUpdateMode={mode === ModalMode.Update}
        showExtraFields={useConsumptionData && isProgram}
      />
    </Modal>
  );
};
