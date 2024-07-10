import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Biker as Spinner } from './Biker';

const Template: StoryFn<typeof Spinner> = () => <Spinner />;

export const Biker = Template.bind({});

export default {
  title: 'Components/Loading',
  component: Spinner,
} as Meta<typeof Spinner>;
