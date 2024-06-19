import React, { useEffect } from 'react';
import { ControlProps } from '@jsonforms/core';
import { extractProperty } from '@common/utils';
import {
  useTranslation,
  Box,
  Typography,
  DetailInputWithLabelRow,
} from '@openmsupply-client/common';
import {
  FORM_INPUT_COLUMN_WIDTH,
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
} from '../../common/styleConstants';
import { usePatientStore } from '@openmsupply-client/programs';
import { useEncounter } from '../../../api';
import { RegexUtils } from '@openmsupply-client/common';
import { DocumentOptions } from './Search';

const { formatTemplateString, removeEmptyLines } = RegexUtils;

export const SearchWithDocumentSource = (
  props: ControlProps & { options: DocumentOptions }
) => {
  const {
    errors: formErrors,
    path,
    handleChange,
    label,
    visible,
    options,
  } = props;

  const { currentPatient = {} } = usePatientStore();

  const {
    data: currentEncounter,
    isLoading,
    isError,
  } = useEncounter.document.byId(useEncounter.utils.idFromUrl());

  const t = useTranslation('programs');

  const documentData =
    options?.['document'] === 'patient'
      ? currentPatient
      : options?.['document'] === 'encounter'
      ? currentEncounter
      : undefined;

  const requestedData = extractProperty(documentData, options?.['path'] ?? '');

  useEffect(() => {
    if (!requestedData) return;

    if (!options?.['saveFields']) {
      handleChange(path, requestedData);
      return;
    }

    const newObj: Record<string, unknown> = {};
    options.saveFields?.forEach(
      field => (newObj[field] = requestedData[field] ?? null)
    );
    handleChange(path, newObj);
  }, [requestedData]);

  const displayElement = (
    <Typography style={{ whiteSpace: 'pre' }}>
      {options?.['displayString'] ? (
        removeEmptyLines(
          formatTemplateString(
            options['displayString'],
            requestedData ?? {},
            ''
          )
        )
      ) : (
        <pre>{JSON.stringify(requestedData, null, 2)}</pre>
      )}
    </Typography>
  );

  const getError = () => {
    if (formErrors) return formErrors;
    if (isLoading) return null;
    if (isError || !documentData) return t('control.search.error.no-document');
    if (!requestedData)
      return t('control.search.error.no-data', { docPath: options?.['path'] });
    return null;
  };

  const error = getError();

  if (!visible) return null;

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: FORM_INPUT_COLUMN_WIDTH }}
        >
          {!error ? (
            displayElement
          ) : (
            <Typography color="error">{error}</Typography>
          )}
        </Box>
      }
    />
  );
};
