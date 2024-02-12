import React from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  useTableStore,
  TableProvider,
  createTableStore,
  useKeyboardHeightAdjustment,
} from '@openmsupply-client/common';
import { useInbound } from '../../../api';
import { QuantityToReturnTable } from './ReturnQuantitiesTable';

interface ReturnItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnItemsModal = ({
  isOpen,
  onClose,
}: ReturnItemsModalProps) => {
  const t = useTranslation('replenishment');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

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

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
        // is ok & next confusing here bc its actually just next?
        nextButton={<DialogButton onClick={onClose} variant="next" />}
        height={height}
        width={1024}
      >
        <QuantityToReturnTable lines={data ?? []} updateLine={() => {}} />
      </Modal>
    </TableProvider>
  );
};
