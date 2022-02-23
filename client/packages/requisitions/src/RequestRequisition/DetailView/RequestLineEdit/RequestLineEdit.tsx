import React, { useState, useEffect } from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useTranslation,
  useBufferState,
  RecordPatch,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { RequestLineEditForm } from './RequestLineEditForm';
import {
  useSaveRequestLines,
  useRequestRequisitionFields,
  useRequestRequisitionLines,
  useIsRequestRequisitionDisabled,
  RequestRequisitionLineFragment,
} from '../../api';

interface RequestLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode | null;
  item: ItemRowFragment | null;
}

const createDraftRequestLine = (
  item: ItemRowFragment,
  id: string
): RequestRequisitionLineFragment => ({
  __typename: 'RequisitionLineNode',
  id,
  itemId: item.id,
  requestedQuantity: 0,
  calculatedQuantity: 0,
  itemStats: {
    __typename: 'ItemStatsNode',
    averageMonthlyConsumption: 0,
    stockOnHand: 0,
    monthsOfStock: 0,
  },
  item: {
    __typename: 'ItemNode',
    id: 'string',
    name: 'string',
    code: 'string',
    unitName: 'string',
  },
});

const useDraftRequisitionLine = (item: ItemRowFragment | null) => {
  const { lines } = useRequestRequisitionLines();
  const { id } = useRequestRequisitionFields('id');
  const { mutate: save, isLoading } = useSaveRequestLines();

  const [draft, setDraft] = useState<RequestRequisitionLineFragment | null>(
    null
  );

  useEffect(() => {
    if (lines && item) {
      const existingLine = lines.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine) return setDraft({ ...existingLine });
      else return setDraft(createDraftRequestLine(item, id));
    } else {
      setDraft(null);
    }
  }, [lines, item, id]);

  const update = (patch: RecordPatch<RequestRequisitionLineFragment>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  return { draft, isLoading, save: () => save(draft), update };
};

export const RequestLineEdit = ({
  isOpen,
  onClose,
  mode,
  item,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const isDisabled = useIsRequestRequisitionDisabled();
  const { Modal } = useDialog({ onClose, isOpen });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const { draft, isLoading, save, update } =
    useDraftRequisitionLine(currentItem);

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={<DialogButton variant="next" onClick={save} />}
      okButton={<DialogButton variant="ok" onClick={save} />}
      height={600}
      width={1024}
    >
      {!isLoading ? (
        <>
          <RequestLineEditForm
            disabled={mode === ModalMode.Update || isDisabled}
            onChangeItem={setCurrentItem}
            item={currentItem}
          />
          <span style={{ whiteSpace: 'pre' }}>
            {JSON.stringify(draft, null, 2)}
          </span>
          <input
            type="number"
            onInput={e =>
              draft &&
              update({
                ...draft,
                requestedQuantity: Number(e.currentTarget.value),
              })
            }
          />
        </>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
