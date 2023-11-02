import React from 'react';
import { ControlProps } from '@jsonforms/core';
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
import { RegexUtils } from '@openmsupply-client/common';
import { PatientContactOptions } from './Search';

const { formatTemplateString, removeEmptyLines } = RegexUtils;

/**
 * Simplified patient data type
 *
 * TODO: store/import the full definition somewhere
 */
type Patient = {
  contacts?: {
    category?: string;
  }[];
};

export const SearchWithPatientContactSource = (
  props: ControlProps & { options: PatientContactOptions }
) => {
  const { errors: formErrors, label, visible, options } = props;

  const { currentPatient } = usePatientStore();
  const t = useTranslation('programs');

  const patientData: Patient | undefined = currentPatient?.documentDraft;

  const contact = patientData?.contacts?.find(
    it => it.category === options.category
  );

  const displayElement = (
    <Typography style={{ whiteSpace: 'pre' }}>
      {options?.displayString ? (
        removeEmptyLines(
          formatTemplateString(options.displayString, contact ?? {}, '')
        )
      ) : (
        <pre>{JSON.stringify(contact, null, 2)}</pre>
      )}
    </Typography>
  );

  const getError = () => {
    if (formErrors) return formErrors;
    if (!contact) return t('control.search.error.no-patient-contact');
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
