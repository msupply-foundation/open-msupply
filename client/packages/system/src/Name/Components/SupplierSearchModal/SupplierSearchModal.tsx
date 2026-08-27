import React from 'react';
import {
  BasicModal,
  Box,
  ModalTitle,
  useTranslation,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { NameSearchModalProps } from '../../utils';
import { SupplierSearchInput } from '../SupplierSearchInput';

interface SupplierSearchProps extends NameSearchModalProps {
  external?: boolean;
  /**
   * e2e hook for the modal, opt-in per call site: this modal is shared by
   * several create flows (inbound shipments, supplier returns, purchase
   * orders, the dashboard widget), so each names its own rather than all
   * four sharing one id.
   */
  testId?: string;
}

export const SupplierSearchModal = ({
  open,
  onClose,
  onChange,
  external,
  testId,
}: SupplierSearchProps) => {
  const t = useTranslation();
  const { height } = useWindowDimensions();
  const modalHeight = height * 0.8;

  return (
    <BasicModal
      open={open}
      onClose={onClose}
      height={modalHeight}
      data-testid={testId}
    >
      <ModalTitle title={t('suppliers')} />
      <Box padding={2}>
        <SupplierSearchInput
          value={null}
          onChange={name => {
            if (name) onChange(name);
          }}
          width={500}
          external={external}
          clearable={false}
          autoFocus
          openOnFocus
        />
      </Box>
    </BasicModal>
  );
};
