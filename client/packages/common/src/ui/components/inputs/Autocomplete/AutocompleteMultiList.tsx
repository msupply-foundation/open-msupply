import React, { FC, useEffect, useState } from 'react';
import {
  AutocompleteOnChange,
  AutocompleteOptionRenderer,
  Checkbox,
  IconButton,
} from '@common/components';
import { CloseIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { RegexUtils } from '@common/utils';
import {
  AutocompleteRenderInputParams,
  Box,
  TextField,
  Typography,
} from '@mui/material';
import { AutocompleteList } from './AutocompleteList';

export interface AutocompleteMultiListProps<T> {
  filterPlaceholder?: string;
  filterProperties: (keyof T)[];
  getOptionLabel?: (option: T) => string;
  height?: number;
  isLoading?: boolean;
  onChange?: (ids: string[]) => void;
  options: T[];
  renderOption?: AutocompleteOptionRenderer<T>;
  width?: number;
}

export const AutocompleteMultiList = <T extends { id: string }>({
  filterPlaceholder,
  filterProperties,
  getOptionLabel,
  height,
  isLoading,
  onChange,
  options,
  renderOption,
  width = 600,
}: AutocompleteMultiListProps<T>): JSX.Element => {
  const [selectedOptions, setSelectedOptions] = useState<T[]>([]);
  const [inputValue, setInputValue] = useState('');

  const onChangeOptions: AutocompleteOnChange<T | T[]> = (_event, options) =>
    setSelectedOptions(options instanceof Array ? options : []);

  const selectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = options.filter(option =>
      RegexUtils.matchObjectProperties(inputValue, option)
    );
    if (event.target.checked) {
      setSelectedOptions([...selectedOptions, ...filtered]);
    } else {
      const filteredIds = filtered.map(option => option.id);
      setSelectedOptions(
        selectedOptions.filter(option => !filteredIds.includes(option.id))
      );
    }
  };

  const ItemInput: FC<AutocompleteRenderInputParams> = props => {
    const { InputProps, ...rest } = props;
    const t = useTranslation();
    const filtered = options.filter(option =>
      RegexUtils.matchObjectProperties(inputValue, option, filterProperties)
    );

    const selectedIds = selectedOptions.map(option => option.id);
    const filteredSelectedCount = filtered.filter(option =>
      selectedIds.includes(option.id)
    ).length;
    const indeterminate =
      filteredSelectedCount > 0 && filteredSelectedCount < filtered.length;
    const checked =
      filteredSelectedCount > 0 && filteredSelectedCount === filtered.length;

    const clearInputButton = !!inputValue && (
      <IconButton
        sx={{ color: 'gray.main' }}
        onClick={() => setInputValue('')}
        icon={<CloseIcon fontSize="small" />}
        label={t('label.clear-filter')}
      />
    );
    return (
      <>
        <Box display="flex">
          <Typography
            flex={1}
            style={{ verticalAlign: 'bottom' }}
            display="flex"
            alignItems="center"
          >
            {t('label.items-selected', { count: selectedOptions.length })}
          </Typography>
          <Typography textAlign="right" flex={1}>
            {t('label.select-all')}
            <Checkbox
              onChange={selectAll}
              indeterminate={indeterminate}
              checked={checked}
            />
          </Typography>
        </Box>
        <TextField
          autoFocus
          InputProps={{
            ...InputProps,
            endAdornment: clearInputButton,
            startAdornment: undefined,
          }}
          {...rest}
          //   TODO: this one
          placeholder={filterPlaceholder || t('placeholder.search-by-name')}
          onChange={e => setInputValue(e.target.value)}
          value={inputValue}
        />
      </>
    );
  };

  useEffect(() => {
    if (onChange) onChange(selectedOptions.map(({ id }) => id));
  }, [selectedOptions]);

  return (
    <AutocompleteList
      options={options}
      loading={isLoading}
      height={height}
      width={width}
      disableCloseOnSelect
      multiple
      getOptionLabel={getOptionLabel}
      filterOptions={(options, state) =>
        options.filter(option =>
          RegexUtils.matchObjectProperties(
            state.inputValue,
            option,
            filterProperties
          )
        )
      }
      renderInput={ItemInput}
      limitTags={0}
      renderOption={renderOption}
      onChange={onChangeOptions}
      inputValue={inputValue}
      value={selectedOptions}
      disableClearable
    />
  );
};
