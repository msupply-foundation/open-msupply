import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { TextButton } from './TextButton';

const Template: ComponentStory<typeof TextButton> = () => (
  <TextButton labelKey="button.docs" onClick={() => console.info('clicked')} />
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/TextButton',
  component: TextButton,
} as ComponentMeta<typeof TextButton>;
