import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BasicSpinner,
  DialogButton,
  ModalMode,
  useDialog,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { RequestFragment, useRequest } from '../../api';
import { useDraftRequisitionLine, useNextRequestLine } from './hooks';
import { isRequestDisabled } from '../../../utils';
import { RequestLineEdit } from './RequestLineEdit';
import {
  Representation,
  RepresentationValue,
  shouldDeleteLine,
} from '../../../common';

import { ItemWithStatsFragment } from '@openmsupply-client/system';

interface RequestLineEditModalProps {
  store?: UserStoreNodeFragment;
  mode: ModalMode | null;
  requisition: RequestFragment;
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  manageVaccinesInDoses: boolean;
}

export const RequestLineEditModal = ({
  store,
  mode,
  requisition,
  itemId,
  isOpen,
  onClose,
  manageVaccinesInDoses,
}: RequestLineEditModalProps) => {
  const deleteLine = useRequest.line.deleteLine();
  const isDisabled = isRequestDisabled(requisition);

  const lines = useMemo(
    () =>
      requisition?.lines.nodes
        .slice()
        .sort((a, b) => a.item.name.localeCompare(b.item.name)) ?? [],
    [requisition?.lines.nodes]
  );

  const [currentItem, setCurrentItem] = useState(
    lines?.find(line => line.item.id === itemId)?.item
  );
  const [representation, setRepresentation] = useState<RepresentationValue>(
    Representation.UNITS
  );

  const { draft, save, update, isLoading } =
    useDraftRequisitionLine(currentItem);
  const draftIdRef = useRef<string | undefined>(draft?.id);
  const { hasNext, next } = useNextRequestLine(lines, currentItem);
  const [isEditingRequested, setIsEditingRequested] = useState(false);

  const useConsumptionData =
    store?.preferences?.useConsumptionAndStockFromCustomersForInternalOrders;
  const nextDisabled =
    (!hasNext && mode === ModalMode.Update) ||
    !currentItem ||
    isEditingRequested;

  const deletePreviousLine = () => {
    const shouldDelete = shouldDeleteLine(mode, draft?.id, isDisabled);
    if (draft?.id && shouldDelete) {
      deleteLine(draft.id);
    }
  };

  useEffect(() => {
    draftIdRef.current = draft?.id;
  }, [draft?.id]);

  const onCancel = () => {
    if (mode === ModalMode.Create) {
      deleteLine(draftIdRef.current || '');
    }
    onClose();
  };

  const { Modal } = useDialog({ onClose: onCancel, isOpen });

  const onChangeItem = (item: ItemWithStatsFragment) => {
    if (mode === ModalMode.Create) {
      deletePreviousLine();
    }
    setRepresentation(Representation.UNITS);
    setCurrentItem(item);
  };

  const onNext = async () => {
    await save();
    if (mode === ModalMode.Update && next) setCurrentItem(next);
    else if (mode === ModalMode.Create) setCurrentItem(undefined);
    else onClose();
    return true;
  };

  // Effect triggered when the selected item changes:
  // 1. The draft is reset by the useDraftRequisitionLine hook
  // 2. For newly created lines, we immediately save to enable requisition chart data
  useEffect(() => {
    if (!!draft?.isCreated) {
      save();
    }
  }, [draft?.isCreated]);

  return (
    <Modal
      title=""
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
      nextButton={
        <DialogButton
          disabled={nextDisabled}
          variant="next-and-ok"
          onClick={onNext}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          disabled={!currentItem || isEditingRequested}
          onClick={async () => {
            await save();
            onClose();
          }}
        />
      }
      height={800}
      width={1200}
    >
      {isLoading ? (
        <BasicSpinner />
      ) : (
        <RequestLineEdit
          requisition={requisition}
          lines={lines}
          currentItem={currentItem}
          onChangeItem={onChangeItem}
          draft={draft}
          update={update}
          isPacksEnabled={!!currentItem?.defaultPackSize}
          representation={representation}
          setRepresentation={setRepresentation}
          disabled={isDisabled}
          isUpdateMode={mode === ModalMode.Update}
          showExtraFields={useConsumptionData && !!requisition?.program}
          manageVaccinesInDoses={manageVaccinesInDoses}
          setIsEditingRequested={setIsEditingRequested}
        />
      )}
    </Modal>
  );
};
