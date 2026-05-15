import React, { FC } from 'react';
import {
  BasicModal,
  Box,
  ModalTitle,
  useTranslation,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { NameSearchProps } from '../../utils';
import { InternalSupplierSearchInput } from '../InternalSupplierSearchInput';

export const InternalSupplierSearchModal: FC<NameSearchProps> = props => {
  const t = useTranslation();
  const { height } = useWindowDimensions();
  const modalHeight = height * 0.8;
  const isList = 'isList' in props;

  // isList renders inline inside its parent → fill the container.
  // Popup renders centred in a BasicModal → fixed width.
  const input = (
    <InternalSupplierSearchInput
      value={null}
      onChange={name => {
        if (name) props.onChange(name);
      }}
      width={isList ? undefined : 500}
      clearable={false}
      autoFocus
      openOnFocus
    />
  );

  if (isList) {
    return <Box padding={2}>{input}</Box>;
  }

  const { open, onClose } = props;

  return (
    <BasicModal open={open} onClose={onClose} height={modalHeight}>
      <ModalTitle title={t('suppliers')} />
      <Box padding={2}>{input}</Box>
    </BasicModal>
  );
};
