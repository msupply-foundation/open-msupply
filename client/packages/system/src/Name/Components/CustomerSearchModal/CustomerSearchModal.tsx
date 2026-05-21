import React, { FC } from 'react';
import {
  BasicModal,
  ModalTitle,
  useTranslation,
  useWindowDimensions,
  Box,
} from '@openmsupply-client/common';
import { NameSearchProps } from '../../utils';
import { CustomerSearchInput } from '../CustomerSearchInput';

const CustomerSearchComponent: FC<NameSearchProps> = props => {
  const t = useTranslation();
  const { height } = useWindowDimensions();
  const modalHeight = height * 0.8;

  const input = (
    <CustomerSearchInput
      value={null}
      onChange={name => {
        if (name) props.onChange(name);
      }}
      width={500}
      clearable={false}
      autoFocus
      openOnFocus
    />
  );

  if ('isList' in props) {
    return <Box padding={2}>{input}</Box>;
  }

  const { open, onClose } = props;

  return (
    <BasicModal open={open} onClose={onClose} height={modalHeight}>
      <ModalTitle title={t('customers')} />
      <Box padding={2}>{input}</Box>
    </BasicModal>
  );
};

export const CustomerSearchModal: FC<NameSearchProps> = props => (
  <CustomerSearchComponent {...props} />
);
