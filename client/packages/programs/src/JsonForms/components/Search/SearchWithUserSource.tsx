import React, { useState } from 'react';
import { ControlProps } from '@jsonforms/core';
import {
  useDebounceCallback,
  // useTranslation,
  Box,
  FormLabel,
  Autocomplete,
  IconButton,
  EditIcon,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../../common/styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../common/hooks/useZodOptionsValidation';
import { useSearchQueries, QueryValues } from './useSearchQueries';

const MIN_CHARS = 3;

const Options = z.object({
  /**
   * Source of the search data -- user input or extract it from document
   */
  query: z.enum(QueryValues),
  optionString: z.string().optional(),
  displayString: z.string().optional(),
});

type Options = z.infer<typeof Options>;

export const SearchWithUserSource = (props: ControlProps) => {
  const { data, path, handleChange, label, uischema } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const [searchText, setSearchText] = useState('');
  const [editMode, setEditMode] = useState(!data);

  const { query, optionString, displayString } = options ?? {};

  const {
    runQuery,
    getOptionLabel,
    getDisplayElement,
    saveFields,
    loading,
    error: queryError,
    results,
  } = useSearchQueries(query, { optionString, displayString });

  const debouncedOnChange = useDebounceCallback(
    value => {
      if (value.length >= MIN_CHARS) runQuery(value);
      else {
        if (results.length) runQuery('');
      }
    },
    [searchText],
    500
  );

  const handleDataUpdate = (selectedResult: Record<string, any> | null) => {
    if (selectedResult === null) return;
    console.log('Selected', selectedResult);
    if (!saveFields) handleChange(path, selectedResult);

    const newObj: Record<string, any> = {};
    saveFields?.forEach(
      field => (newObj[field] = selectedResult[field] ?? null)
    );
    handleChange(path, newObj);
    setEditMode(false);
  };

  if (!options) return null;

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      style={{ minWidth: 300 }}
      margin={0.5}
      marginLeft={0}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      {editMode ? (
        <Box flexBasis={FORM_INPUT_COLUMN_WIDTH} justifyContent="flex-start">
          <>
            <Autocomplete
              sx={{ '.MuiFormControl-root': { minWidth: '100%' } }}
              options={results}
              disabled={!props.enabled}
              onChange={(_, option) => handleDataUpdate(option)}
              onInputChange={(_, value) => {
                setSearchText(value);
                debouncedOnChange(value);
              }}
              onBlur={() => {
                if (data) setEditMode(false);
              }}
              getOptionLabel={getOptionLabel ?? undefined}
              clearable={!props.config?.required}
              inputProps={{
                error: !!zErrors || !!props.errors || !!queryError,
                helperText: zErrors ?? props.errors ?? queryError,
              }}
              noOptionsText={loading ? 'Searching...' : 'No results'}
              renderInput={params => (
                <BasicTextInput {...params} placeholder="Search..." />
              )}
            />
          </>
        </Box>
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: FORM_INPUT_COLUMN_WIDTH }}
        >
          {getDisplayElement && getDisplayElement(data)}
          <IconButton
            label="Edit"
            icon={<EditIcon style={{ width: 16 }} />}
            onClick={() => {
              setEditMode(true);
            }}
            color="primary"
            height={'20px'}
            width={'20px'}
          />
        </Box>
      )}
    </Box>
  );
};
