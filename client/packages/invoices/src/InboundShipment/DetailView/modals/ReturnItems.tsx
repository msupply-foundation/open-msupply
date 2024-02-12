import React from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  useTableStore,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';

interface ReturnItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnItemsModal = ({
  isOpen,
  onClose,
}: ReturnItemsModalProps) => {
  const t = useTranslation('replenishment');

  // TODO: query for return items

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  // TODO: what this from? is it relevant // should this be checked before modal opens?
  // TODO: also show please select lines
  // const isDisabled = useInbound.utils.isDisabled();
  const { items, lines } = useInbound.lines.rows();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  const ids = selectedRows.map(({ id }) => id);

  const { data } = useInbound.lines.newReturnLines(ids);
  console.log(data);

  return (
    <Modal
      title={t('heading.return-items')}
      cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
      // is ok & next confusing here bc its actually just next?
      nextButton={<DialogButton onClick={onClose} variant="next" />}
    >
      <>
        TODO: list here (will need new table provider){' '}
        {selectedRows.map(({ id }) => id).join(', ')}
      </>
    </Modal>
  );
};

/**
 * Next steps:
 * - bring in the table provider
 * - bring in the table
 * - add the stepper
 * - make the quantity editable
 */
