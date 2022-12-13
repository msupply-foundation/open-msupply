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
          <Box
            display="flex"
            flexDirection="row"
            justifyContent="center"
            gap={1}
            width={50}
          >
            <Box flex={0} style={{ height: 24, minWidth: 20 }}>
              {props['aria-disabled'] && <CheckIcon fontSize="small" />}
            </Box>
          </Box>
          <Typography>{name}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };
