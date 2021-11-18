import React from 'react';
import { AutocompleteList, BaseAutocompleteListProps } from '../../inputs';
import { useWindowDimensions } from '../../../../hooks';
import { LocaleKey } from '../../../../intl';
import { BasicModal } from '../BasicModal';
import { ModalTitle } from '../ModalTitle';

interface ListSearchProps<T> extends BaseAutocompleteListProps<T> {
  title: LocaleKey;
  open: boolean;
  onClose: () => void;
  optionKey: keyof T;
}

export const ListSearch = <T extends unknown>({
  title,
  options,
  optionKey,
  open,
  onClose,
  onChange,
  loading = false,
}: ListSearchProps<T>): JSX.Element => {
  const { height } = useWindowDimensions();

  const modalHeight = height * 0.8;
  const listViewHeight = modalHeight - 100;

  return (
    <BasicModal open={open} onClose={onClose} height={modalHeight}>
      <ModalTitle title={title} />
      <AutocompleteList
        onChange={onChange}
        loading={loading}
        options={options}
        optionKey={optionKey}
        height={listViewHeight}
      />
    </BasicModal>
  );
};
