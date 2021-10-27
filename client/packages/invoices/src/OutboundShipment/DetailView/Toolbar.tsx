import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '../CustomerSearchInput';
import { OutboundShipment } from './types';
import { isInvoiceEditable } from '../utils';

interface ToolbarProps {
  draft: OutboundShipment;
}

export const Toolbar: FC<ToolbarProps> = ({ draft }) => {
  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container flexDirection="column" display="flex" flex={1}>
        <Grid item display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={1}>
            <InputWithLabelRow
              label="label.customer-name"
              Input={
                <CustomerSearchInput
                  disabled={!isInvoiceEditable(draft)}
                  value={draft.name}
                  onChange={name => {
                    draft.update?.('name', name);
                  }}
                />
              }
            />
            <InputWithLabelRow
              label="label.customer-ref"
              Input={
                <BasicTextInput
                  disabled
                  size="small"
                  sx={{ width: 250 }}
                  value={draft?.theirReference ?? ''}
                  onChange={event => {
                    draft.update?.('theirReference', event.target.value);
                  }}
                />
              }
            />
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
