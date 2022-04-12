import React from 'react';
import {
  AutocompleteList,
  AutocompleteOptionRenderer,
  AutocompleteListProps,
} from '../../inputs';
import { useWindowDimensions } from '@common/hooks';
import { BasicModal } from '../BasicModal';
import { ModalTitle } from '../ModalTitle';

interface ListSearchProps<T> extends AutocompleteListProps<T> {
  title: string;
  open: boolean;
  onClose: () => void;
  optionKey?: keyof T;
  renderOption?: AutocompleteOptionRenderer<T>;
  getOptionDisabled?: (option: T) => boolean;
}

export const ListSearch = <T,>({
  filterOptions,
  getOptionLabel,
  title,
  options,
  optionKey,
  renderOption,
  open,
  onClose,
  onChange,
  getOptionDisabled,
  loading = false,
}: ListSearchProps<T>): JSX.Element => {
  const { height } = useWindowDimensions();

  const modalHeight = height * 0.8;
  const listViewHeight = modalHeight - 100;

  return (
    <BasicModal open={open} onClose={onClose} height={modalHeight}>
      <ModalTitle title={title} />
      <AutocompleteList
        filterOptions={filterOptions}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        onChange={onChange}
        loading={loading}
        options={options}
        optionKey={optionKey}
        height={listViewHeight}
        getOptionDisabled={getOptionDisabled}
      />
    </BasicModal>
  );
};
