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
  (props, item) =>
    (
      <DefaultAutocompleteItemOption {...props}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Box display="flex" flexDirection="row" gap={1} width={110}>
            <Box flex={0} style={{ height: 24, minWidth: 20 }}>
              {!!item.store && <HomeIcon fontSize="small" />}
            </Box>
            <Typography
              overflow="hidden"
              fontWeight="bold"
              textOverflow="ellipsis"
              sx={{
                whiteSpace: 'no-wrap',
              }}
            >
              {item.code}
            </Typography>
          </Box>
          <Typography>
            {item.name}
            {item.isOnHold ? ` (${onHoldLabel})` : ''}
          </Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
