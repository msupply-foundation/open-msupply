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
}

export const SupplierSearchModal = ({
  open,
  onClose,
  onChange,
  external,
}: SupplierSearchProps) => {
  const t = useTranslation();
  const { height } = useWindowDimensions();
  const modalHeight = height * 0.8;

  return (
    <BasicModal open={open} onClose={onClose} height={modalHeight}>
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
