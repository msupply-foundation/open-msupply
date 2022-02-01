import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { ButtonSkeleton } from './ButtonSkeleton';

export default {
  title: 'Skeleton/Button',
  component: ButtonSkeleton,
} as ComponentMeta<typeof ButtonSkeleton>;

const Template: ComponentStory<typeof ButtonSkeleton> = () => (
  <ButtonSkeleton />
);

export const Primary = Template.bind({});
