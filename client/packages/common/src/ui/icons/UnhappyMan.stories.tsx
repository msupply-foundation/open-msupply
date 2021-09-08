import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { UnhappyMan } from './UnhappyMan';

export default {
  title: 'Assets/UnhappyMan',
  component: UnhappyMan,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof UnhappyMan>;

const Template: ComponentStory<typeof UnhappyMan> = args => (
  <UnhappyMan {...args} />
);

export const Primary = Template.bind({});
