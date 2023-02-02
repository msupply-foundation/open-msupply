import React, { FC, useState } from 'react';
import { ArrayControlProps } from '@jsonforms/core';

import {
  Box,
  FormLabel,
  Autocomplete,
  AutocompleteRenderInputParams,
} from '@mui/material';
import {
  useTranslation,
  ConfirmationModal,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../../styleConstants';
import { UISchemaWithCustomProps } from './common';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';

interface EnumArrayControlCustomProps extends ArrayControlProps {
  uischema: UISchemaWithCustomProps;
  removeItems: (path: string, toDelete: number[]) => () => void;
  data: string[];
}

const sortOptions = (options: string[]) => {
  const sortedOptions = options.sort((a, b) => a.localeCompare(b));
  return sortedOptions;
};

const searchRanking = {
  STARTS_WITH: 2,
  CONTAINS: 1,
  NO_MATCH: 0,
} as const;

const filterOptions = (
  options: string[],
  { inputValue }: { inputValue: string }
) => {
  const searchTerm = inputValue.toLowerCase();
  const filteredOptions = options
    .map(option => {
      const lowerCaseOption = option.toLowerCase();

      const rank = lowerCaseOption.startsWith(searchTerm)
        ? searchRanking.STARTS_WITH
        : lowerCaseOption.includes(searchTerm)
        ? searchRanking.CONTAINS
        : searchRanking.NO_MATCH;
      return { option, rank };
    })
    .filter(({ rank }) => rank !== searchRanking.NO_MATCH)
    .sort((a, b) => b.rank - a.rank)
    .map(({ option }) => option);

  return filteredOptions;
};

// Finds the index where an item has been removed from newList. It is assumed
// that the removal of an item is the only change between both lists. Thus,
// length of newList must be one less than the length of the base list
const findIndexOfRemoved = (base: string[], newList: string[]): number => {
  if (base.length - 1 !== newList.length) {
    throw Error(
      'Unexpected list length, newList.length must be one less than base.length.'
    );
  }

  for (let i = 0; i < newList.length; i++) {
    if (base[i] !== newList[i]) {
      return i;
    }
  }
  // last item must have been removed
  return base.length - 1;
};

export const EnumArrayComponent: FC<EnumArrayControlCustomProps> = ({
  data,
  label,
  path,
  schema,
  visible,
  enabled,
  addItem,
  removeItems,
}) => {
  const t = useTranslation('common');
  const [removeIndex, setRemoveIndex] = useState<number | undefined>();

  const renderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      {...props}
      color="secondary"
      InputProps={{
        disableUnderline: false,
        style: props.disabled ? { paddingLeft: 0 } : {},
        ...props.InputProps,
      }}
    />
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        justifyContent="space-around"
        style={{ minWidth: 300 }}
        margin={0.5}
      >
        <Box
          style={{ textAlign: 'end', alignSelf: 'start', paddingTop: 5 }}
          flexBasis={FORM_LABEL_COLUMN_WIDTH}
        >
          <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
        </Box>
        <Box sx={{ width: FORM_INPUT_COLUMN_WIDTH }}>
          <Autocomplete
            disabled={!enabled}
            multiple
            sx={{
              '& .MuiFormControl-root': { minWidth: '100%' },
            }}
            value={data}
            options={sortOptions(schema.enum ?? [])}
            filterOptions={filterOptions}
            renderOption={(props, option, { inputValue }) => {
              const matches = match(option, inputValue, {
                insideWords: true,
              });
              const parts = parse(option, matches);

              return (
                <li {...props}>
                  <div>
                    {parts.map((part, index) => (
                      <span
                        key={index}
                        style={{
                          fontWeight: part.highlight ? 600 : 400,
                        }}
                      >
                        {part.text}
                      </span>
                    ))}
                  </div>
                </li>
              );
            }}
            renderInput={renderInput}
            onChange={(_, value) => {
              if (value.length - 1 === data.length) {
                addItem(path, value[value.length - 1])();
              } else {
                const index = findIndexOfRemoved(data, value);
                setRemoveIndex(index);
              }
            }}
            disableClearable={true}
          />
        </Box>
      </Box>
      <ConfirmationModal
        open={removeIndex !== undefined}
        onConfirm={() => {
          if (removeIndex !== undefined) {
            removeItems(path, [removeIndex])();
            setRemoveIndex(undefined);
          }
        }}
        onCancel={() => setRemoveIndex(undefined)}
        title={t('label.remove')}
        message={t('messages.confirm-remove-item')}
      />
    </>
  );
};
