import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { BasicSpinner } from '../BasicSpinner';

const Template: ComponentStory<typeof BasicSpinner> = () => <BasicSpinner />;

export const Primary = Template.bind({});

export default {
  title: 'Components/BasicSpinner',
  component: BasicSpinner,
} as ComponentMeta<typeof BasicSpinner>;
