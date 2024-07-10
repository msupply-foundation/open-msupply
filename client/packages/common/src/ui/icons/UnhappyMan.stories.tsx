import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { UnhappyMan } from './UnhappyMan';

export default {
  title: 'Assets/UnhappyMan',
  component: UnhappyMan,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof UnhappyMan>;

const Template: StoryFn<typeof UnhappyMan> = args => (
  <UnhappyMan {...args} />
);

export const Primary = Template.bind({});
