import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';

const Template: ComponentStory<typeof LoadingSpinner> = () => (
  <LoadingSpinner />
);

export const Primary = Template.bind({});

export default {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
} as ComponentMeta<typeof LoadingSpinner>;
