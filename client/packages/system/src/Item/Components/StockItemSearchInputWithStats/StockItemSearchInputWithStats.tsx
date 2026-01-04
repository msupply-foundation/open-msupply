import React, { useEffect, useState } from 'react';
import {
  useToggle,
  useTranslation,
  defaultOptionMapper,
  useStringFilter,
  useDebouncedValueCallback,
  AutocompleteWithPagination,
  useFormatNumber,
} from '@openmsupply-client/common';
import { useItem, useStockItemsWithStats } from '../../api';
import {
  getOptionLabel,
  StockItemSearchInputWithStatsProps,
} from '../../utils';
import { getItemOptionRenderer } from '../ItemOptionRenderer';

const DEBOUNCE_TIMEOUT = 300;
const ROWS_PER_PAGE = 20;

export const StockItemSearchInputWithStats = ({
  onChange,
  currentItemId,
  disabled = false,
  width,
  autoFocus = false,
  openOnFocus,
  filter: extraFilter,
}: StockItemSearchInputWithStatsProps) => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const selectControl = useToggle();

  const { filter, onFilter } = useStringFilter('codeOrName');

  const [search, setSearch] = useState('');

  const debounceOnFilter = useDebouncedValueCallback(
    (searchText: string) => onFilter(searchText),
    [onFilter],
    DEBOUNCE_TIMEOUT
  );

  const { data, isLoading, fetchNextPage, isFetchingNextPage } =
    useStockItemsWithStats({
      rowsPerPage: ROWS_PER_PAGE,
      filter: {
        ...filter,
        ...extraFilter,
      },
    });

  const pageNumber = data?.pages[data?.pages.length - 1]?.pageNumber ?? 0;
  const {
    byId: { data: currentItem },
  } = useItem(currentItemId ?? undefined);

  useEffect(() => {
    if (currentItem && search === '') setSearch(getOptionLabel(currentItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem]);

  useEffect(() => {
    if (openOnFocus && !disabled) {
      setTimeout(() => selectControl.toggleOn(), DEBOUNCE_TIMEOUT);
    }
  }, [openOnFocus, disabled, selectControl]);

  return (
    <AutocompleteWithPagination
      pages={data?.pages ?? []}
      pageNumber={pageNumber}
      rowsPerPage={ROWS_PER_PAGE}
      totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
      autoFocus={autoFocus}
      disabled={disabled}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      filterOptions={options =>
        options.filter(
          option =>
            option.name?.toLowerCase().includes(search.toLowerCase()) ||
            option.code?.toLowerCase().includes(search.toLowerCase())
        )
      }
      loading={isLoading || isFetchingNextPage}
      value={
        currentItem ? { ...currentItem, label: currentItem.name ?? '' } : null
      }
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => {
        setSearch(item ? getOptionLabel(item) : '');
        onChange(item);
      }}
      mapOptions={items =>
        defaultOptionMapper(items, 'name').sort((a, b) =>
          a.label.localeCompare(b.label)
        )
      }
      getOptionLabel={option => `${option.code}     ${option.name}`}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      open={selectControl.isOn}
      renderOption={getItemOptionRenderer(
        t('label.units'),
        formatNumber.format
      )}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      sx={{
        '.MuiInputBase-root': { paddingLeft: disabled ? 0 : undefined },
        '.MuiBox-root': { justifyContent: 'flex-start' },
        paddingX: '25px',
      }}
      onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
      inputValue={search}
      inputProps={{
        onChange: e => {
          const { value } = e.target;
          setSearch(value);
          debounceOnFilter(value);
        },
        onBlur: () => {
          setSearch(currentItem ? getOptionLabel(currentItem) : '');
        },
      }}
    />
  );
};
