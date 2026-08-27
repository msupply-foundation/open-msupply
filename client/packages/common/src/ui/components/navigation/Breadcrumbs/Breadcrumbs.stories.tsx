import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { Box } from '@mui/material';
import { Breadcrumbs } from './Breadcrumbs';
import { RouteBuilder } from '../../../../utils';
import { AppRoute } from '@openmsupply-client/config';

export default {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
} as Meta<typeof Breadcrumbs>;

const Template: StoryFn<{ initialEntries: string[] }> = () => (
  <Box>
    <Breadcrumbs />
  </Box>
);

export const Short = Template.bind({});
Short.parameters = {
  routes: [RouteBuilder.create(AppRoute.Distribution).build()],
};

export const Medium = Template.bind({});
Medium.parameters = {
  routes: [
    RouteBuilder.create(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart('3')
      .build(),
  ],
};

export const TooLong = Template.bind({});
TooLong.parameters = {
  routes: [
    RouteBuilder.create(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart('3')
      .build(),
  ],
};
