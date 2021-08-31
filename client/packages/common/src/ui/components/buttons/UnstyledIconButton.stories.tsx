import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { UnstyledIconButton } from '.';
import { Book } from '../../icons';

const Template: ComponentStory<typeof UnstyledIconButton> = () => (
  <UnstyledIconButton
    icon={<Book />}
    titleKey="button.docs"
    onClick={() => console.info('clicked')}
  />
);

export const Primary = Template.bind({});

export default {
  title: 'Buttons/UnstyledIconButton',
  component: UnstyledIconButton,
} as ComponentMeta<typeof UnstyledIconButton>;
