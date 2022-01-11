import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Biker as Spinner } from './Biker';

const Template: ComponentStory<typeof Spinner> = () => <Spinner />;

export const Biker = Template.bind({});

export default {
  title: 'Components/Loading',
  component: Spinner,
} as ComponentMeta<typeof Spinner>;
