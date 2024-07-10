import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { ButtonSkeleton } from './ButtonSkeleton';

export default {
  title: 'Skeleton/Button',
  component: ButtonSkeleton,
} as Meta<typeof ButtonSkeleton>;

const Template: StoryFn<typeof ButtonSkeleton> = () => (
  <ButtonSkeleton />
);

export const Primary = Template.bind({});
