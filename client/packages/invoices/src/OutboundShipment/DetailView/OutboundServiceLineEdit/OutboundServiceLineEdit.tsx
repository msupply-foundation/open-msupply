import * as React from 'react';
import { useDialog } from '@openmsupply-client/common';

interface OutboundServiceLineEditProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OutboundServiceLineEdit = ({
  isOpen,
  onClose,
}: OutboundServiceLineEditProps) => {
  const { Modal } = useDialog({ isOpen, onClose });

  return (
    <Modal title="Service Charges">
      <span>:)</span>
    </Modal>
  );
};
