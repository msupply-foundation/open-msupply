import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Pulse as Spinner } from './Pulse';

const Template: StoryFn<typeof Spinner> = () => <Spinner />;

export const Pulse = Template.bind({});

export default {
  title: 'Components/Loading',
  component: Spinner,
} as Meta<typeof Spinner>;
