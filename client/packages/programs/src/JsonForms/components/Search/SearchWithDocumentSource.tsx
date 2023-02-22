import React, { useEffect, useState } from 'react';
import { ControlProps } from '@jsonforms/core';
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
import { RegexUtils, JSXFormatters } from '@openmsupply-client/common';
import { get as extractProperty } from 'lodash';

const Options = z.object({
  /**
   * Which pre-defined query to use (in useSearchQueries)
   */
  document: z.enum(['patient', 'encounter']),
  /**
   * Path in the specified document to extract
   */
  path: z.string().optional(),
  /**
   * Pattern for formatting selected result (as above)
   */
  displayString: z.string().optional(),
  /**
   * List of fields to save in document data (from selected item object)
   */
  saveFields: z.array(z.string()).optional(),
});

type Options = z.infer<typeof Options>;

const { formatTemplateString } = RegexUtils;
const { replaceHTMLlineBreaks } = JSXFormatters;

export const SearchWithDocumentSource = (props: ControlProps) => {
  const { path, handleChange, label, uischema } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const { currentPatient = {} } = usePatientStore();

  // fetch current encounter
  const { data: currentEncounter } = useEncounter.document.byId(
    useEncounter.utils.idFromUrl()
  );

  const t = useTranslation('programs');

  // Put relevant document into variable "document"

  const documentData =
    options?.document === 'patient'
      ? currentPatient
      : options?.document === 'encounter'
      ? currentEncounter
      : {};

  console.log('documentData', documentData);
  console.log('currentEncounter', currentEncounter);

  const requestedData = extractProperty(
    documentData,
    options?.path ?? '',
    'Not found'
  );

  console.log('requestedData', requestedData);

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
    <Typography>
      {options?.displayString
        ? replaceHTMLlineBreaks(
            formatTemplateString(options.displayString, documentData ?? {}, '')
          )
        : replaceHTMLlineBreaks(
            formatTemplateString('${firstName} ${lastName}', requestedData, '')
          )}
    </Typography>
  );

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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ width: FORM_INPUT_COLUMN_WIDTH }}
      >
        {documentData ? displayElement : <p>Missing stuff</p>}
      </Box>
    </Box>
  );
};
