import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { BasicSpinner as Spinner } from '../BasicSpinner';

const Template: StoryFn<typeof Spinner> = args => <Spinner {...args} />;

export const BasicSpinner = Template.bind({});
export const SavingSpinner = Template.bind({});

SavingSpinner.args = { messageKey: 'saving' };

export default {
  title: 'Components/Loading',
  component: Spinner,
} as Meta<typeof Spinner>;
