import React, { useEffect, useState } from 'react';
import { ControlProps } from '@jsonforms/core';
import {
  useDebounceCallback,
  useTranslation,
  Box,
  Autocomplete,
  IconButton,
  EditIcon,
  BasicTextInput,
  Typography,
  DetailInputWithLabelRow,
  FilterBy,
  Select,
} from '@openmsupply-client/common';
import {
  FORM_INPUT_COLUMN_WIDTH,
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
} from '../../common/styleConstants';
import { useSearchQueries } from './useSearchQueries';
import { UserOptions } from './Search';
import { JsonFormsDispatch } from '@jsonforms/react';
import { PatientRowFragment } from '@openmsupply-client/system';

const MIN_CHARS = 3;

export const SearchWithUserSource = (
  props: ControlProps & { options: UserOptions }
) => {
  const {
    data,
    path,
    handleChange,
    label,
    visible,
    options,
    schema,
    renderers,
  } = props;
  const t = useTranslation('programs');
  const [searchText, setSearchText] = useState('');
  const [editMode, setEditMode] = useState(!data);
  const [noResultsText, setNoResultsText] = useState(
    t('control.search.searching-label')
  );
  const [selectedPatient, setSelectedPatient] = useState<
    PatientRowFragment | undefined
  >(data.id);

  // console.log('path', path);
  // console.log('data', data);
  // console.log('props', props);
  // console.log('options', options);
  // console.log('schema', schema);
  // console.log('uischema', uischema);

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

  useEffect(() => {
    // Only run the database query if a specific patient hasn't yet been
    // selected
    if (selectedPatient) return;

    const searchFilter: FilterBy = {};
    options.searchFields.forEach(field => {
      if (data[field]) searchFilter[field] = { like: data[field] };
    });
    if (Object.keys(searchFilter).length > 0) runQuery(searchFilter);
  }, [data]);

  const debouncedOnChange = useDebounceCallback(
    value => {
      if (value.length >= MIN_CHARS) runQuery(value);
      else {
        // Clear the results if user input falls *below* `minChars`
        if (results.length) runQuery({});
      }
      setNoResultsText(t('control.search.no-results-label'));
    },
    [searchText],
    500
  );

  const handleSelect = (selectedResult: Record<string, unknown> | null) => {
    if (selectedResult === null) return;
    if (!saveFields) handleChange(path, selectedResult);
    else {
      const newObj: Record<string, unknown> = {};
      saveFields?.forEach(
        field => (newObj[field] = selectedResult[field] ?? null)
      );
      handleChange(path, newObj);
    }
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

  const error = props.errors ?? queryError ?? null;

  if (!visible) return null;

  return (
    <>
      <JsonFormsDispatch
        schema={schema}
        uischema={{
          type: 'VerticalLayout',
          // elements: options.elements
        }}
        path={path}
        renderers={renderers}
      />
      {results.length > 0 && (
        <Select
          options={results.map(res => ({
            label: getOptionLabel(res) ?? '',
            value: 'res',
          }))}
          onChange={_ => {
            setSelectedPatient(undefined);
          }}
          value={selectedPatient ?? null}
        />
      )}
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={label}
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
        Input={
          editMode ? (
            <Autocomplete
              sx={{
                '.MuiFormControl-root': { minWidth: '100%' },
                flexBasis: '100%',
              }}
              options={results}
              disabled={!props.enabled}
              onChange={(_, option) => handleSelect(option)}
              onInputChange={(_, value) => {
                debouncedOnChange(value);
                setSearchText(value);
                setNoResultsText(t('control.search.searching-label'));
              }}
              onBlur={() => {
                if (data) setEditMode(false);
              }}
              // getOptionLabel={getOptionLabel ?? undefined}
              clearable={!props.config?.required}
              inputProps={{
                error: !!error,
                helperText: error,
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
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexBasis="100%"
              sx={{ width: FORM_INPUT_COLUMN_WIDTH }}
            >
              {!error ? (
                <>
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
                </>
              ) : (
                <Typography color="error">{error}</Typography>
              )}
            </Box>
          )
        }
      />
    </>
  );
};
