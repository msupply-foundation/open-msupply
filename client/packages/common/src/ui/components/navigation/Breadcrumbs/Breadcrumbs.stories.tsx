import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { Breadcrumbs } from './Breadcrumbs';
import { StoryProvider, TestingRouter } from '../../../../utils/testing';
import { RouteBuilder } from '../../../../utils';
import { AppRoute } from '@openmsupply-client/config';

export default {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
} as Meta<typeof Breadcrumbs>;

const Template: StoryFn<{ initialEntries: string[] }> = ({ initialEntries }) => {
  return (
    <StoryProvider>
      <TestingRouter initialEntries={initialEntries}>
        <Route
          path="*"
          element={
            <Box>
              <Breadcrumbs />
            </Box>
          }
        ></Route>
      </TestingRouter>
    </StoryProvider>
  );
};

export const Short = Template.bind({});
Short.args = {
  initialEntries: [RouteBuilder.create(AppRoute.Distribution).build()],
};

export const Medium = Template.bind({});
Medium.args = {
  initialEntries: [
    RouteBuilder.create(AppRoute.Distribution)
      .addPart(AppRoute.OutboundShipment)
      .addPart('3')
      .build(),
  ],
};

export const TooLong = Template.bind({});
TooLong.args = {
  initialEntries: [
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
