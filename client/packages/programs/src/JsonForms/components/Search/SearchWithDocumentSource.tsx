import React, { useEffect } from 'react';
import { ControlProps } from '@jsonforms/core';
import { get as extractProperty } from 'lodash';
import {
  useTranslation,
  Box,
  FormLabel,
  Typography,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../../common/styleConstants';
import { usePatientStore } from 'packages/programs/src/hooks';
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

    const newObj: Record<string, any> = {};
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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ width: FORM_INPUT_COLUMN_WIDTH }}
      >
        {!error ? displayElement : <Typography color="red">{error}</Typography>}
      </Box>
    </Box>
  );
};
