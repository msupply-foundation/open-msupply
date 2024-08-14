import React, { useEffect } from 'react';
import {
  GenderType,
  PatientSearchInput,
  RegexUtils,
} from '@openmsupply-client/common';
import { ControlProps, UISchemaElement } from '@jsonforms/core';
import {
  useTranslation,
  Box,
  Typography,
  DetailInputWithLabelRow,
  Select,
  Button,
} from '@openmsupply-client/common';
import {
  FORM_INPUT_COLUMN_WIDTH,
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
} from '../../common/styleConstants';
import { usePatientSearchQuery } from './usePatientSearchQuery';
import { UserOptions } from './Search';
import { JsonFormsDispatch } from '@jsonforms/react';
import { PatientSchema } from '@openmsupply-client/programs';

const { formatTemplateString } = RegexUtils;

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
  const isPatientSelected = !!data?.id;
  const { results, error: queryError, mutateAsync } = usePatientSearchQuery();

  useEffect(() => {
    const searchFilter = !isPatientSelected
      ? createSearchFilter(options?.searchFields, data)
      : undefined;
    if (!searchFilter) return;
    mutateAsync(searchFilter);
  }, [data, isPatientSelected, mutateAsync, options?.searchFields]);

  const getOptionLabel = (data: PatientSchema) =>
    options?.optionString
      ? formatTemplateString(options?.optionString, data)
      : `${data['code'] ? data['code'] + '-' : ''} ${data['firstName']} ${
          data['lastName']
        }`;

  const handlePatientSelect = (patientId: string) => {
    const patient = results.find(p => p.id === patientId);
    if (!patient) return;
    if (!options?.saveFields) {
      handleChange(path, patient);
      return;
    }
    const newData = Object.fromEntries(
      Object.entries(patient).filter(([key]) =>
        (options.saveFields as string[])?.includes(key)
      )
    );
    handleChange(path, newData);
  };

  const error = props.errors ?? queryError ?? null;

  if (!visible) return null;

  return (
    <Box>
      <Typography
        variant="subtitle1"
        width={'100%'}
        textAlign="left"
        marginBottom={1}
        paddingBottom={1}
        paddingTop={3}
      >
        <strong>{label}</strong>
      </Typography>
      <JsonFormsDispatch
        schema={schema}
        uischema={
          {
            type: 'VerticalLayout',
            elements: options.elements,
          } as UISchemaElement
        }
        path={path}
        renderers={renderers}
        enabled={!isPatientSelected}
      />
      {(isPatientSelected || results.length > 0) && (
        <DetailInputWithLabelRow
          sx={DefaultFormRowSx}
          label=""
          labelWidthPercentage={FORM_LABEL_WIDTH}
          inputAlignment={'start'}
          Input={
            !isPatientSelected ? (
              <Box>
                <Typography variant="body2" mt={1} mb={1}>
                  <em>{t('control.search.matching-patients')}</em>
                </Typography>
                <Select
                  options={results.map(res => ({
                    label: getOptionLabel(res) ?? '',
                    value: res.id,
                  }))}
                  onChange={e => handlePatientSelect(e.target.value)}
                  fullWidth
                />
              </Box>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexBasis="100%"
                sx={{ width: FORM_INPUT_COLUMN_WIDTH }}
              >
                {!error ? (
                  <Button
                    onClick={() => {
                      handleChange(path, {});
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    {t('control.search.reset-button')}
                  </Button>
                ) : (
                  <Typography color="error">{error}</Typography>
                )}
              </Box>
            )
          }
        />
      )}
    </Box>
  );
};

const createSearchFilter = (
  searchFields: string[],
  data: Record<string, string | undefined> | undefined
) => {
  if (!data) return undefined;

  const searchFilter: PatientSearchInput = {
    code: searchFields.includes('code') ? data['code'] : undefined,
    code2: searchFields.includes('code2') ? data['code2'] : undefined,
    dateOfBirth: searchFields.includes('dateOfBirth')
      ? data['dateOfBirth']
      : undefined,
    firstName: searchFields.includes('firstName')
      ? data['firstName']
      : undefined,
    gender: searchFields.includes('gender')
      ? (data['gender'] as GenderType)
      : undefined,
    lastName: searchFields.includes('lastName') ? data['lastName'] : undefined,
    identifier: searchFields.includes('identifier')
      ? data['identifier']
      : undefined,
  };

  return Object.values(searchFilter).every(v => v === undefined)
    ? undefined
    : searchFilter;
};
