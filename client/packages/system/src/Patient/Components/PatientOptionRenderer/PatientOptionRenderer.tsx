import React from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
} from '@openmsupply-client/common';
import { PatientRowFragment } from '../../api';

export const getPatientOptionRenderer =
  (): AutocompleteOptionRenderer<PatientRowFragment> => (props, item) =>
    (
      <DefaultAutocompleteItemOption {...props} key={item.id}>
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
              {item.code}
            </Typography>
          </Box>
          <Typography>{item.name}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
