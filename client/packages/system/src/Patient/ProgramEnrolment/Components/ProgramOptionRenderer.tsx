import React from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
} from '@openmsupply-client/common';
import { ProgramRowFragmentWithId } from '../api';

export const getProgramOptionRenderer =
  (): AutocompleteOptionRenderer<ProgramRowFragmentWithId> =>
  (props, program) =>
    (
      <DefaultAutocompleteItemOption {...props}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Box display="flex" flexDirection="row" gap={1} width={110}>
            <Typography
              overflow="hidden"
              fontWeight="bold"
              textOverflow="ellipsis"
              sx={{
                whiteSpace: 'no-wrap',
              }}
            >
              {program.type.substring(0, 3)}
            </Typography>
          </Box>
          <Typography>{program.type}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
