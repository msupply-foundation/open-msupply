import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BasicSpinner,
  DialogButton,
  ModalMode,
  ModalTabs,
  useDialog,
  useNotification,
  usePreferences,
  UserStoreNodeFragment,
  Representation,
  RepresentationValue,
} from '@openmsupply-client/common';
import { ItemWithStatsFragment } from '@openmsupply-client/system';
import { ResponseFragment, useResponse } from '../../api';
import { ResponseLineEdit } from './ResponseLineEdit';
import { useDraftRequisitionLine, useNextResponseLine } from './hooks';
import { ResponseStoreStats } from '../ResponseStats/ResponseStoreStats';
import { RequestStoreStats } from '../ResponseStats/RequestStoreStats';
import { shouldDeleteLine } from 'packages/requisitions/src/utils';

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
  const { error } = useNotification();
  const deleteLine = useResponse.line.deleteLine();
  const isDisabled = useResponse.utils.isDisabled();
  const { orderInPacks } = usePreferences();

  const lines = useMemo(
    () =>
      requisition.lines.nodes
        .slice()
        .sort((a, b) => a.item.name.localeCompare(b.item.name)) ?? [],
    [requisition.lines.nodes]
  );
  const [currentItem, setCurrentItem] = useState(
    lines.find(line => line.item.id === itemId)?.item
  );
  const rep = orderInPacks ? Representation.PACKS : Representation.UNITS;

  const [representation, setRepresentation] =
    useState<RepresentationValue>(rep);
  const [isEditingSupply, setIsEditingSupply] = useState(false);

  const { draft, update, save, isLoading, isReasonsError } =
    useDraftRequisitionLine(currentItem);
  const draftIdRef = useRef<string | undefined>(draft?.id);
  const { hasNext, next } = useNextResponseLine(lines, currentItem);
  const nextDisabled =
    (!hasNext && mode === ModalMode.Update) || !currentItem || isEditingSupply;

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
    setRepresentation(rep);
    setCurrentItem(item);
  };

  const handleSave = async () => {
    const result = await save();

    if (result?.error) {
      error(result.error)();
      return false;
    }
    return true;
  };

  const onSave = async () => {
    const success = await handleSave();
    if (!success) return false;
    if (mode === ModalMode.Update && next) setCurrentItem(next);
    else if (mode === ModalMode.Create) setCurrentItem(undefined);
    else onClose();
    return true;
  };

  // Effect triggered when the selected item changes:
  // 1. The draft is reset by the useDraftRequisitionLine hook
  // 2. For newly created lines, we immediately save to enable requisition chart
  //    data
  useEffect(() => {
    if (!!draft?.isCreated) {
      save();
    }
  }, [draft?.isCreated]);

  const { data } = useResponse.line.stats(!draft?.isCreated, draft?.id);
  const itemVolume =
    (draft?.availableVolumeByLocationType?.itemVolumePerUnit ?? 0) *
    (draft?.supplyQuantity ?? 0);

  const tabs = [
    {
      Component: (
        <ResponseStoreStats
          requisitionStatus={requisition.status}
          defaultPackSize={currentItem?.defaultPackSize || 1}
          representation={representation}
          unitName={currentItem?.unitName}
          stockOnHand={data?.responseStoreStats.stockOnHand ?? 0}
          incomingStock={data?.responseStoreStats.incomingStock ?? 0}
          stockOnOrder={data?.responseStoreStats.stockOnOrder ?? 0}
          requestedQuantity={data?.responseStoreStats.requestedQuantity ?? 0}
          otherRequestedQuantity={
            data?.responseStoreStats.otherRequestedQuantity ?? 0
          }
        />
      ),
      value: 'label.my-store',
    },
    {
      Component: (
        <RequestStoreStats
          representation={representation}
          defaultPackSize={currentItem?.defaultPackSize ?? 1}
          unitName={currentItem?.unitName}
          maxMonthsOfStock={data?.requestStoreStats.maxMonthsOfStock ?? 0}
          suggestedQuantity={data?.requestStoreStats.suggestedQuantity ?? 0}
          availableStockOnHand={data?.requestStoreStats.stockOnHand ?? 0}
          averageMonthlyConsumption={
            data?.requestStoreStats.averageMonthlyConsumption ?? 0
          }
          volumeTypeName={
            draft?.availableVolumeByLocationType?.locationType.name
          }
          availableVolume={
            draft?.availableVolumeByLocationType?.availableVolume
          }
          itemVolume={itemVolume}
        />
      ),
      value: 'label.customer',
    },
  ];

  return (
    <Modal
      title=""
      contentProps={{
        sx: {
          padding: 0,
        },
      }}
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
          disabled={!currentItem || isEditingSupply}
          onClick={async () => {
            const success = await handleSave();
            if (success) onClose();
          }}
        />
      }
      height={800}
      width={1200}
    >
      {isLoading ? (
        <BasicSpinner />
      ) : (
        <>
          <ResponseLineEdit
            store={store}
            requisition={requisition}
            lines={lines}
            draft={draft}
            currentItem={currentItem}
            onChangeItem={onChangeItem}
            update={update}
            representation={representation}
            setRepresentation={setRepresentation}
            disabled={isDisabled}
            isUpdateMode={mode === ModalMode.Update}
            isReasonsError={isReasonsError}
            setIsEditingSupply={setIsEditingSupply}
          />
          {!!draft && (
            <ModalTabs
              tabs={tabs}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                background: theme => theme.palette.background.toolbar,
              }}
            />
          )}
        </>
      )}
    </Modal>
  );
};
