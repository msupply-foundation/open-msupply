import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { FlatButton } from '.';
import { Book } from '../../icons';

const Template: ComponentStory<typeof FlatButton> = args => (
  <FlatButton
    {...args}
    icon={<Book color={args.color} />}
    labelKey="button.docs"
    onClick={() => console.info('clicked')}
  />
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

export default {
  title: 'Buttons/FlatButton',
  component: FlatButton,
} as ComponentMeta<typeof FlatButton>;

Secondary.args = { color: 'secondary' };
