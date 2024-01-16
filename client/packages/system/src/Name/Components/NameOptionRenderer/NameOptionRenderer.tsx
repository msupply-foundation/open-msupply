import React from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
} from '@openmsupply-client/common';
import { NameRowFragment } from '../../api';
import { NameRenderer } from '../NameRenderer/NameRenderer';

export const getNameOptionRenderer =
  (onHoldLabel: string): AutocompleteOptionRenderer<NameRowFragment> =>
  (props, item) => (
    <DefaultAutocompleteItemOption {...props} key={item.id}>
      <Box display="flex" alignItems="flex-end" gap={1} height={25}>
        <NameRenderer
          label={item.code}
          isStore={!!item.store}
          width={110}
          sx={{ fontWeight: 'bold' }}
        />
        <Typography>
          {item.name}
          {item.isOnHold ? ` (${onHoldLabel})` : ''}
        </Typography>
      </Box>
    </DefaultAutocompleteItemOption>
  );
