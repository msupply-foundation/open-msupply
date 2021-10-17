import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  TabList,
  Tab,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { CustomerSearchInput } from '../CustomerSearchInput';
import { OutboundShipment } from './types';

interface OutboundShipmentToolbarProps {
  draft: OutboundShipment;
  currentTab: string;
  onChangeTab: (newTab: string) => void;
}

export const OutboundShipmentDetailViewToolbar: FC<OutboundShipmentToolbarProps> =
  ({ draft, onChangeTab, currentTab }) => {
    const t = useTranslation();

    return (
      <AppBarContentPortal
        sx={{
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
          paddingLeft: '25px',
        }}
      >
        <Grid container flexDirection="column" display="flex" flex={1}>
          <Grid item display="flex" flex={1}>
            <Box
              component="form"
              display="flex"
              flex={1}
              flexDirection="column"
              gap={1}
              flexShrink={1}
            >
              <InputWithLabelRow
                label="label.customer-name"
                Input={
                  <CustomerSearchInput
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
                    size="small"
                    sx={{ width: 250 }}
                    value={draft.theirReference}
                    onChange={event => {
                      draft.update?.('theirReference', event.target.value);
                    }}
                  />
                }
              />
            </Box>
          </Grid>
          <Grid item display="flex" flex={1}>
            <Box display="flex" flex={1} justifyContent="flex-end" />
            <Box
              display="flex"
              flex={1}
              justifyContent="center"
              alignItems="flex-end"
            >
              <TabList
                value={currentTab}
                onChange={(_, val) => onChangeTab(val)}
              >
                <Tab value="general" label={t('label.general')} />
                <Tab value="transport" label={t('label.transport')} />
              </TabList>
            </Box>
            <Box display="flex" flex={1} justifyContent="flex-end" />
          </Grid>
        </Grid>
      </AppBarContentPortal>
    );
  };
