import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { UnstyledIconButton } from './UnstyledIconButton';
import { Book, SvgIconProps } from '../../icons';

const Template: ComponentStory<React.FC<SvgIconProps>> = args => (
  <UnstyledIconButton
    icon={<Book {...args} />}
    titleKey="button.docs"
    onClick={() => console.info('clicked')}
  />
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

export default {
  title: 'Buttons/UnstyledIconButton',
  component: UnstyledIconButton,
} as ComponentMeta<typeof UnstyledIconButton>;

Secondary.args = { color: 'secondary' } as SvgIconProps;
