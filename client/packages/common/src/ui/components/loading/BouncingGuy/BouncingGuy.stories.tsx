import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { BouncingGuy as Spinner } from './BouncingGuy';

const Template: StoryFn<typeof Spinner> = () => <Spinner />;

export const BouncingGuy = Template.bind({});

export default {
  title: 'Components/Loading',
  component: Spinner,
} as Meta<typeof Spinner>;
