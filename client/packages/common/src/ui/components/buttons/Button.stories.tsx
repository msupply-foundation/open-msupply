import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Button } from '.';
import { Book } from '../../icons';

const Template: ComponentStory<typeof Button> = () => (
  <Button
    icon={<Book />}
    labelKey="button.docs"
    onClick={() => console.info('clicked')}
  />
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/Button',
  component: Button,
} as ComponentMeta<typeof Button>;
