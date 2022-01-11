import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { BouncingGuy as Spinner } from './BouncingGuy';

const Template: ComponentStory<typeof Spinner> = () => <Spinner />;

export const BouncingGuy = Template.bind({});

export default {
  title: 'Components/Loading',
  component: Spinner,
} as ComponentMeta<typeof Spinner>;
