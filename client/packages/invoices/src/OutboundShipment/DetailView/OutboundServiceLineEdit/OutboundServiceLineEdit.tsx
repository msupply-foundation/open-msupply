import * as React from 'react';
import { useDialog } from '@openmsupply-client/common';
import { ServiceItemSearchInput } from '@openmsupply-client/system';
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
      <ServiceItemSearchInput width={300} onChange={() => {}} />
    </Modal>
  );
};
