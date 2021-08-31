import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { IconButton } from '.';
import { Book } from '../../icons';

const Template: ComponentStory<typeof IconButton> = () => (
  <IconButton
    icon={<Book />}
    titleKey="button.docs"
    onClick={() => console.info('clicked')}
  />
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/IconButton',
  component: IconButton,
} as ComponentMeta<typeof IconButton>;
