import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Pulse as Spinner } from './Pulse';

const Template: ComponentStory<typeof Spinner> = () => <Spinner />;

export const Pulse = Template.bind({});

export default {
  title: 'Components/Loading',
  component: Spinner,
} as ComponentMeta<typeof Spinner>;
