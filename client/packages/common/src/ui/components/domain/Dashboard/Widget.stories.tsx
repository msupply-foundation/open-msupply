import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Widget } from './Widget';
import { Typography } from '@mui/material';

const Template: ComponentStory<typeof Widget> = () => (
  <Widget titleKey="app.stock">
    <Typography>[ This is a dashboard widget with nothing in it ]</Typography>
  </Widget>
);

export const Primary = Template.bind({});

export default {
  title: 'Components/Widget',
  component: Widget,
} as ComponentMeta<typeof Widget>;
