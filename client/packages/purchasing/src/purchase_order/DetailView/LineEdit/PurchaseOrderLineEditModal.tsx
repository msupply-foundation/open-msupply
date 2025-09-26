import React from 'react';
import {
  Box,
  ModalMode,
  useDialog,
  useFormatNumber,
  useIntlUtils,
  useNotification,
  useTranslation,
  DialogButton,
  InlineSpinner,
  Typography,
  useUrlQuery,
} from '@openmsupply-client/common';
import { ItemStockOnHandFragment } from '@openmsupply-client/system';
import { PurchaseOrderFragment, usePurchaseOrderLine } from '../../api';
import { PurchaseOrderLineEdit } from './PurchaseOrderLineEdit';
import { createDraftPurchaseOrderLine } from './utils';

interface PurchaseOrderLineEditModalProps {
  lineId: string | null;
  purchaseOrder: PurchaseOrderFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled: boolean;
  hasNext: boolean;
  openNext: () => void;
}

export const PurchaseOrderLineEditModal = ({
  lineId,
  purchaseOrder,
  mode,
  isOpen,
  onClose,
  isDisabled,
  hasNext,
  openNext,
}: PurchaseOrderLineEditModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const { round } = useFormatNumber();
  const { getPlural } = useIntlUtils();
  const { updateQuery } = useUrlQuery();

  const lines = purchaseOrder.lines.nodes;
  const isUpdateMode = mode === ModalMode.Update;

  const {
    create: { create, isCreating },
    update: { update, isUpdating },
    draft,
    updatePatch,
  } = usePurchaseOrderLine(lineId);
  const unit = draft?.unit || t('label.unit', { count: 2 });

  const onChangeItem = (item: ItemStockOnHandFragment) => {
    const draftLine = createDraftPurchaseOrderLine(item, purchaseOrder.id);
    item &&
      updatePatch({
        ...draftLine,
        requestedPackSize: item.defaultPackSize ?? 1,
        itemId: item.id,
      });
  };

  const handleSave = async () => {
    try {
      if (mode === ModalMode.Create) {
        await create();
        updateQuery({ tab: t('label.general') });
      } else if (mode === ModalMode.Update) {
        const res = await update();
        const { success, error: updateError } = res;
        if (!success) {
          if (updateError) {
            error(updateError)();
          }
          return false;
        }
      }
      return true;
    } catch (e: unknown) {
      if (e instanceof Error) {
        error(e.message)();
      } else {
        error('unknown error')();
      }
      return false;
    }
  };

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  return (
    <Modal
      title=""
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!draft}
          onClick={async () => {
            const success = await handleSave();
            if (success) onClose();
          }}
        />
      }
      nextButton={
        isUpdateMode ? (
          <DialogButton
            variant="next-and-ok"
            disabled={!hasNext}
            onClick={async () => {
              await handleSave();
              openNext();
              return true;
            }}
          />
        ) : undefined
      }
      height={700}
      width={1200}
      enableAutocomplete
    >
      {isCreating || isUpdating ? (
        <Box
          display="flex"
          flex={1}
          height={300}
          justifyContent="center"
          alignItems="center"
        >
          <InlineSpinner />
        </Box>
      ) : (
        <>
          <PurchaseOrderLineEdit
            draft={draft}
            update={updatePatch}
            status={purchaseOrder.status}
            isDisabled={isDisabled}
            lines={lines}
            isUpdateMode={isUpdateMode}
            onChangeItem={onChangeItem}
            lineCount={lines.length}
          />
          <Box display="flex" ml={2} pt={1} gap={1}>
            <Typography width={250}>{t('label.ordered-in-others')}:</Typography>
            <Typography fontWeight={800}>
              {round(draft.unitsOrderedInOthers)}{' '}
              {getPlural(unit, draft.unitsOrderedInOthers)}
            </Typography>
          </Box>
        </>
      )}
    </Modal>
  );
};
