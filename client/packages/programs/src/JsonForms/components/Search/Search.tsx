import React, { useEffect, useMemo, useState } from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useDebounceCallback,
  useTranslation,
  Box,
  FormLabel,
  Autocomplete,
  FlatButton,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../../common/styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../common/hooks/useZodOptionsValidation';
import { useDebouncedTextInput } from '../../common/hooks/useDebouncedTextInput';
import { FORM_LABEL_WIDTH } from '../../common/styleConstants';
import { useJSONFormsCustomError } from '../../common/hooks/useJSONFormsCustomError';
import { QueryValues, useSearchQueries } from './useSearchQueries';
import { usePatientStore } from 'packages/programs/src/hooks';

const MIN_CHARS = 3;

const Options = z
  .object({
    /**
     * The main query type being requested, as defined in queries.ts
     */
    query: z.enum(QueryValues),
  })
  .strict();
type Options = z.infer<typeof Options>;

export const searchTester = rankWith(10, uiTypeIs('Search'));

const UIComponent = (props: ControlProps) => {
  const { data, path, handleChange, errors, label, config } = props;
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );
  const [searchText, setSearchText] = useState('');
  const [editMode, setEditMode] = useState(!data);
  const { documentName } = usePatientStore();

  console.log('patient', documentName);

  const {
    runQuery,
    source,
    getOptionLabel,
    getDisplayElement,
    saveFields,
    loading,
    error,
    results,
  } = useSearchQueries(schemaOptions?.query);

  const debouncedOnChange = useDebounceCallback(
    value => {
      if (value.length >= MIN_CHARS) runQuery(value);
    },
    [searchText]
  );

  const handleDataUpdate = selectedResult => {
    if (!saveFields) handleChange(path, selectedResult);

    const newObj = {};
    saveFields?.forEach(
      field => (newObj[field] = selectedResult[field] ?? null)
    );
    handleChange(path, newObj);
  };

  return (
    <div>
      {source === 'input' && (
        <>
          <Box
            display="flex"
            alignItems="center"
            gap={2}
            justifyContent="space-around"
            style={{ minWidth: 300 }}
            margin={0.5}
            marginLeft={0}
          >
            <Box
              style={{ textAlign: 'end' }}
              flexBasis={FORM_LABEL_COLUMN_WIDTH}
            >
              <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
            </Box>
            <Box
              flexBasis={FORM_INPUT_COLUMN_WIDTH}
              justifyContent="flex-start"
            >
              <>
                <Autocomplete
                  freeSolo
                  sx={{ '.MuiFormControl-root': { minWidth: '100%' } }}
                  options={results}
                  getOptionLabel={getOptionLabel}
                  disabled={!props.enabled}
                  // value={searchText}
                  onChange={(_, data) => handleDataUpdate(data)}
                  onInputChange={(_, value) => {
                    setSearchText(value);
                    debouncedOnChange(value);
                  }}
                  filterOptions={x => x}
                  // getOptionLabel={getOptionLabel}
                  clearable={!props.config?.required}
                  inputProps={{
                    error: !!zErrors || !!props.errors,
                    helperText: zErrors ?? props.errors,
                  }}
                  // renderOption={(props, option) => option.value}
                  // isOptionEqualToValue={option => option.value === data}
                />
              </>
            </Box>
          </Box>
          <Box display="flex">
            <Box
              style={{ textAlign: 'end' }}
              flexBasis={FORM_LABEL_COLUMN_WIDTH}
            />
            {getDisplayElement && getDisplayElement(data)}
          </Box>
        </>
      )}
    </div>
  );
};

export const Search = withJsonFormsControlProps(UIComponent);
