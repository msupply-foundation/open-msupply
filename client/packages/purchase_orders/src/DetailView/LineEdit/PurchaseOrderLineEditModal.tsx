import { ModalMode, useDialog, useNotification } from '@common/hooks';
import { PurchaseOrderFragment, PurchaseOrderLineFragment } from '../../api';
import { DialogButton, InlineSpinner } from '@common/components';
import { useTranslation, Box } from '@openmsupply-client/common';
import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrderLineEdit } from './PurchaseOrderLineEdit';

type PurchaseOrderLineItem = PurchaseOrderLineFragment['item'];

interface PurchaseOrderLineEditModalProps {
  itemId: string | null;
  purchaseOrder: PurchaseOrderFragment;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseOrderLineEditModal = ({
  itemId,
  purchaseOrder,
  mode,
  isOpen,
  onClose,
}: PurchaseOrderLineEditModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const lines = useMemo(
    () =>
      purchaseOrder.lines.nodes
        .slice()
        .sort((a, b) => a.item.name.localeCompare(b.item.name)) ?? [],
    [purchaseOrder.lines.nodes]
  );

  const [currentItem, setCurrentItem] = useState<PurchaseOrderLineItem | null>(
    lines.find(line => line.item.id === itemId)?.item ?? null
  );

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const isLoading = false;

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          variant="next-and-ok"
          onClick={async () => {
            console.log('clicked');
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          disabled={!currentItem}
          onClick={async () => {
            console.log('clicked');
          }}
        />
      }
      height={700}
      width={1200}
      enableAutocomplete /* Required for previously entered batches to be remembered and suggested in future shipments */
    >
      {isLoading ? (
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
        <PurchaseOrderLineEdit
          isExternalSupplier={false}
        ></PurchaseOrderLineEdit>
      )}
    </Modal>
  );
};
