import React, { useState } from 'react';
import { StoreRowFragment, usePaginatedStores } from '../../api';
import {
  AutocompleteWithPagination,
  CLEAR,
  useDebouncedValue,
} from '@openmsupply-client/common';
import { StoreOptionRender } from './StoreOptionRenderer';

const DEBOUNCE_TIMEOUT = 500;
const RECORDS_PER_PAGE = 100;

type StoreSearchInputProps = {
  clearable?: boolean;
  fullWidth?: boolean;
  isDisabled?: boolean;
  value?: StoreRowFragment;
  onPageChange?: (page: number) => void;
  onChange: (newStore: StoreRowFragment) => void;
  onInputChange: (
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => void;
};

export const StoreSearchInput = ({
  clearable = false,
  fullWidth = false,
  isDisabled = false,
  value,
  onChange,
  onInputChange,
}: StoreSearchInputProps) => {
  const [input, setInput] = useState<string>(
    value ? `${value.code} ${value.storeName}` : ''
  );
  const debouncedInput = useDebouncedValue(input, DEBOUNCE_TIMEOUT);
  const { data, isFetching, fetchNextPage } = usePaginatedStores({
    rowsPerPage: RECORDS_PER_PAGE,
    filter: debouncedInput ? { codeOrName: { like: debouncedInput } } : null,
  });

  const pageNumber = data?.pages?.length
    ? (data.pages[data.pages.length - 1]?.pageNumber ?? 0)
    : 0;

  return (
    <AutocompleteWithPagination
      pages={data?.pages ?? []}
      pageNumber={pageNumber}
      rowsPerPage={RECORDS_PER_PAGE}
      totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
      width={fullWidth ? '100%' : undefined}
      sx={fullWidth ? { width: '100%' } : undefined}
      filterOptions={options => options}
      clearable={clearable}
      loading={isFetching}
      getOptionLabel={option => `${option.code} ${option.storeName}`}
      renderOption={StoreOptionRender}
      disabled={isDisabled}
      onChange={(_, value) => {
        if (value) {
          onChange(value);
          setInput(value.storeName);
        }
      }}
      value={value ? { label: value.storeName, ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
      inputValue={input}
      inputProps={{
        onChange: e => {
          const { value } = e.target;
          setInput(value);
        },
        onBlur: () => {
          if (value) {
            setInput(value.storeName);
          }
        },
      }}
      onInputChange={(event, value, reason) => {
        if (reason === CLEAR) {
          setInput('');
        }
        onInputChange(event, value, reason);
      }}
    />
  );
};
