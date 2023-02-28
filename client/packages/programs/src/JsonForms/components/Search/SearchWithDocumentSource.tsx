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
import { z } from 'zod';
import { useZodOptionsValidation } from '../../common/hooks/useZodOptionsValidation';
import { usePatientStore } from 'packages/programs/src/hooks';
import { useEncounter } from '../../../api';
import { RegexUtils } from '@openmsupply-client/common';

const Options = z
  .object({
    source: z.enum(['document']),
    /**
     * Source document type. Either the current patient or the current encounter (if applicable).
     */
    document: z.enum(['patient', 'encounter']),
    /**
     * Path in the specified document to extract
     */
    path: z.string(),
    /**
     * Pattern for formatting selected result (as above)
     */
    displayString: z.string().optional(),
    /**
     * List of fields to be saved in the document data (from selected source document)
     * The fields are stored in an object at the `scope` path of this UI control.
     */
    saveFields: z.array(z.string()).optional(),
  })
  .strict();

type Options = z.infer<typeof Options>;

const { formatTemplateString } = RegexUtils;

export const SearchWithDocumentSource = (props: ControlProps) => {
  const {
    errors: formErrors,
    path,
    handleChange,
    label,
    uischema,
    visible,
  } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const { currentPatient = {} } = usePatientStore();

  const {
    data: currentEncounter,
    isLoading,
    isError,
  } = useEncounter.document.byId(useEncounter.utils.idFromUrl());

  const t = useTranslation('programs');

  const documentData =
    options?.document === 'patient'
      ? currentPatient
      : options?.document === 'encounter'
      ? currentEncounter
      : undefined;

  const requestedData = extractProperty(documentData, options?.path ?? '');

  useEffect(() => {
    if (!requestedData) return;

    if (!options?.saveFields) {
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
      {options?.displayString ? (
        formatTemplateString(options.displayString, requestedData ?? {}, '')
      ) : (
        <pre>{JSON.stringify(requestedData, null, 2)}</pre>
      )}
    </Typography>
  );

  const getError = () => {
    if (zErrors) return zErrors;
    if (formErrors) return formErrors;
    if (isLoading) return null;
    if (isError || !documentData) return t('control.search.error.no-document');
    if (!requestedData)
      return t('control.search.error.no-data', { docPath: options?.path });
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
