import React from 'react';
import { AutocompleteList } from '../..';
import { useWindowDimensions } from '../../../..';
import { LocaleKey } from '../../../../intl/intlHelpers';
import { BasicModal } from '../BasicModal';
import { ModalTitle } from '../ModalTitle';

interface ListSearchProps<T> {
  title: LocaleKey;
  options: T[];
  optionKey: keyof T;
  open: boolean;
  onClose: () => void;
}

export const ListSearch = <T extends unknown>({
  title,
  options,
  optionKey,
  open,
  onClose,
}: ListSearchProps<T>): JSX.Element => {
  const { height } = useWindowDimensions();

  const modalHeight = height * 0.8;
  const listViewHeight = modalHeight - 100;

  return (
    <BasicModal open={open} onClose={onClose} height={modalHeight}>
      <ModalTitle title={title} />
      <AutocompleteList
        options={options}
        optionKey={optionKey}
        height={listViewHeight}
      />
    </BasicModal>
  );
};
