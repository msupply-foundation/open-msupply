import React from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  HomeIcon,
  Box,
} from '@openmsupply-client/common';
import { NameRowFragment } from '../../api';

export const getNameOptionRenderer =
  (onHoldLabel: string): AutocompleteOptionRenderer<NameRowFragment> =>
  (props, name) =>
    (
      <DefaultAutocompleteItemOption {...props} key={name.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Box display="flex" flexDirection="row" gap={1} width={110}>
            <Box flex={0} style={{ height: 24, minWidth: 20 }}>
              {!!name.store && <HomeIcon fontSize="small" />}
            </Box>
            <Typography
              overflow="hidden"
              fontWeight="bold"
              textOverflow="ellipsis"
              sx={{
                whiteSpace: 'no-wrap',
              }}
            >
              {name.code}
            </Typography>
          </Box>
          <Typography>
            {name.name}
            {name.isOnHold ? ` (${onHoldLabel})` : ''}
          </Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
