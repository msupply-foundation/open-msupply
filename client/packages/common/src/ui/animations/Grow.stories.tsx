import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Grow } from '.';
import { UnhappyMan } from '@common/icons';

const Template: StoryFn<typeof Grow> = args => (
  <Grow in {...args}>
    <div>
      <UnhappyMan />
    </div>
  </Grow>
);

export const Normal = Template.bind({});
export const OneSecond = Template.bind({});
export const TransformOrigin = Template.bind({});

OneSecond.args = { timeout: 1000 };
TransformOrigin.args = { timeout: 1000, style: { transformOrigin: '0 0 0' } };

export default {
  title: 'Animations/Grow',
  component: Grow,
} as Meta<typeof Grow>;
