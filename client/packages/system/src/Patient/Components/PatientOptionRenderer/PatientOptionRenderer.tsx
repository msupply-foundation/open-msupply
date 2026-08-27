import React from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
} from '@openmsupply-client/common';
import { SearchInputPatient } from '../../utils';

export const getPatientOptionRenderer =
  (): AutocompleteOptionRenderer<SearchInputPatient> => (props, patient) => (
    <DefaultAutocompleteItemOption
      {...props}
      key={patient.id}
      sx={{
        backgroundColor: 'white',
      }}
    >
      <Box display="flex" alignItems="flex-end" gap={1} height={25}>
        <Box display="flex" flexDirection="row" gap={1} width={110}>
          <Typography
            overflow="hidden"
            fontWeight="bold"
            textOverflow="ellipsis"
            sx={{
              whiteSpace: 'nowrap',
            }}
          >
            {patient.code}
          </Typography>
        </Box>
        <Box display="flex" flexDirection="row" gap={1} width={100}>
          <Typography whiteSpace="nowrap" color="secondary">
            {patient.dateOfBirth}
          </Typography>
        </Box>
        <Typography>{patient.name}</Typography>
      </Box>
    </DefaultAutocompleteItemOption>
  );
