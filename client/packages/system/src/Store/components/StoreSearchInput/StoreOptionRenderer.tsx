import React from 'react';
import {
  DefaultAutocompleteItemOption,
  Typography,
  Box,
} from '@openmsupply-client/common';
import { StoreRowFragment } from '../../api';

export const getStoreOptionRenderer =
  () =>
  (props: React.HTMLAttributes<HTMLLIElement>, store: StoreRowFragment) => (
    <DefaultAutocompleteItemOption {...props} key={store.id}>
      <Box display="flex" flexDirection="row" gap={1} width={110}>
        <Typography
          overflow="hidden"
          fontWeight="bold"
          textOverflow="ellipsis"
          sx={{
            whiteSpace: 'nowrap',
          }}
        >
          {store.code}
        </Typography>
      </Box>
      <Box display="flex" flexDirection="row" gap={1} width={100}>
        <Typography whiteSpace={'nowrap'}>{store.storeName}</Typography>
      </Box>
    </DefaultAutocompleteItemOption>
  );
