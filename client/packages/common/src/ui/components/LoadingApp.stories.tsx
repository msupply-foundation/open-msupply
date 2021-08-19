import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { LoadingApp } from '.';

const Template: ComponentStory<typeof LoadingApp> = () => <LoadingApp />;

export const Primary = Template.bind({});

export default {
  title: 'Example/Loading',
  component: LoadingApp,
} as ComponentMeta<typeof LoadingApp>;
