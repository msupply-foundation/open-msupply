import React, { useState } from 'react';
import { ControlProps } from '@jsonforms/core';
import {
  useDebounceCallback,
  useTranslation,
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
   * Which pre-defined query to use (in useSearchQueries)
   */
  query: z.enum(QueryValues),
  /**
   * Pattern for formatting options list items (e.g. "${firstName} ${lastName}")
   */
  optionString: z.string().optional(),
  /**
   * Pattern for formatting selected result (as above)
   */
  displayString: z.string().optional(),
  /**
   * List of fields to save in document data (from selected item object)
   */
  saveFields: z.array(z.string()).optional(),
  /**
   * Text to show in input field before user entry
   */
  placeholderText: z.string().optional(),
});

type Options = z.infer<typeof Options>;

export const SearchWithUserSource = (props: ControlProps) => {
  const { data, path, handleChange, label, uischema } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const t = useTranslation('programs');
  const [searchText, setSearchText] = useState('');
  const [editMode, setEditMode] = useState(!data);
  const [noResultsText, setNoResultsText] = useState(
    t('control.search.searching-label')
  );

  const {
    runQuery,
    getOptionLabel,
    getDisplayElement,
    saveFields,
    placeholderText,
    loading,
    error: queryError,
    results,
  } = useSearchQueries(options ?? {});

  const debouncedOnChange = useDebounceCallback(
    value => {
      if (value.length >= MIN_CHARS) runQuery(value);
      else {
        // Clear the results if user input falls *below* `minChars`
        if (results.length) runQuery('');
      }
      setNoResultsText(t('control.search.no-results-label'));
    },
    [searchText],
    500
  );

  const handleDataUpdate = (selectedResult: Record<string, any> | null) => {
    if (selectedResult === null) return;
    if (!saveFields) handleChange(path, selectedResult);

    const newObj: Record<string, any> = {};
    saveFields?.forEach(
      field => (newObj[field] = selectedResult[field] ?? null)
    );
    handleChange(path, newObj);
    setEditMode(false);
  };

  const getNoOptionsText = () => {
    switch (true) {
      case loading:
        return t('control.search.searching-label');
      case searchText.length < MIN_CHARS:
        return t('control.search.below-min-chars', { minChars: MIN_CHARS });
      default:
        return noResultsText;
    }
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
                debouncedOnChange(value);
                setSearchText(value);
                setNoResultsText(t('control.search.searching-label'));
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
              noOptionsText={getNoOptionsText()}
              renderInput={params => (
                <BasicTextInput
                  {...params}
                  placeholder={
                    placeholderText ?? t('control.search.search-placeholder')
                  }
                />
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
            label={t('label.edit')}
            icon={<EditIcon style={{ width: 16 }} />}
            onClick={() => {
              setEditMode(true);
            }}
            color="primary"
            height="20px"
            width="20px"
          />
        </Box>
      )}
    </Box>
  );
};
