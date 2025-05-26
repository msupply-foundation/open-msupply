import React, { useEffect, useMemo, useState } from 'react';
import {
  DialogButton,
  ModalMode,
  ModalTabs,
  useBufferState,
  useDialog,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { ResponseFragment, useResponse } from '../../api';
import { ResponseLineEdit } from './ResponseLineEdit';
import { useDraftRequisitionLine, useNextResponseLine } from './hooks';
import { Representation, RepresentationValue } from '../../../common';
import { ItemWithStatsFragment } from '@openmsupply-client/system';
import { ResponseStoreStats } from '../ResponseStats/ResponseStoreStats';
import { RequestStoreStats } from '../ResponseStats/RequestStoreStats';

interface ResponseLineEditModalProps {
  requisition: ResponseFragment;
  itemId: string | null;
  store?: UserStoreNodeFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ResponseLineEditModal = ({
  itemId,
  requisition,
  store,
  mode,
  isOpen,
  onClose,
}: ResponseLineEditModalProps) => {
  const { Modal } = useDialog({ onClose, isOpen });
  const deleteLine = useResponse.line.deleteLine();
  const isDisabled = useResponse.utils.isDisabled();

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

  const { draft, update, save } = useDraftRequisitionLine(currentItem);
  const { hasNext, next } = useNextResponseLine(currentItem);
  const { data } = useResponse.line.stats(draft?.id);

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

  const tabs = [
    {
      Component: (
        <ResponseStoreStats
          stockOnHand={data?.responseStoreStats.stockOnHand || 0}
          incomingStock={data?.responseStoreStats.incomingStock || 0}
          stockOnOrder={data?.responseStoreStats.stockOnOrder || 0}
          requestedQuantity={data?.responseStoreStats.requestedQuantity || 0}
          otherRequestedQuantity={
            data?.responseStoreStats.otherRequestedQuantity || 0
          }
        />
      ),
      value: 'label.my-store',
    },
    {
      Component: (
        <RequestStoreStats
          maxMonthsOfStock={data?.requestStoreStats.maxMonthsOfStock || 0}
          suggestedQuantity={data?.requestStoreStats.suggestedQuantity || 0}
          availableStockOnHand={data?.requestStoreStats.stockOnHand || 0}
          averageMonthlyConsumption={
            data?.requestStoreStats.averageMonthlyConsumption || 0
          }
        />
      ),
      value: 'label.customer',
    },
  ];

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
      <>
        <ResponseLineEdit
          store={store}
          requisition={requisition}
          lines={lines}
          draft={draft}
          totalStockOnHand={data?.responseStoreStats.stockOnHand || 0}
          currentItem={currentItem}
          onChangeItem={onChangeItem}
          update={update}
          representation={representation}
          setRepresentation={setRepresentation}
          disabled={isDisabled}
          isUpdateMode={mode === ModalMode.Update}
        />
        <ModalTabs
          tabs={tabs}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            background: theme => theme.palette.background.toolbar,
          }}
        />
      </>
    </Modal>
  );
};
