import React from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
  CheckIcon,
} from '@openmsupply-client/common';
import { ProgramDocumentRegistryFragment } from '../api';
import { ProgramRowFragmentWithId } from '../../Patient';

export const getProgramOptionRenderer =
  (): AutocompleteOptionRenderer<
    ProgramDocumentRegistryFragment | ProgramRowFragmentWithId
  > =>
  (props, program) => {
    const name =
      'document' in program
        ? program?.document?.documentRegistry?.name
        : program.name;
    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Box display="flex" flexDirection="row" gap={1} width={110}>
            <Box flex={0} style={{ height: 24, minWidth: 20 }}>
              {props['aria-disabled'] && <CheckIcon fontSize="small" />}
            </Box>
            <Typography
              overflow="hidden"
              fontWeight="bold"
              textOverflow="ellipsis"
              sx={{
                whiteSpace: 'no-wrap',
              }}
            >
              {name?.substring(0, 3)}
            </Typography>
          </Box>
          <Typography>{name}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };
