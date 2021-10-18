import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { IconButton } from './IconButton';
import { BookIcon, SvgIconProps } from '../../icons';

const Template: ComponentStory<React.FC<SvgIconProps>> = args => (
  <Box>
    <IconButton
      icon={<BookIcon {...args} />}
      labelKey="button.docs"
      onClick={() => console.info('clicked')}
    />
  </Box>
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

export default {
  title: 'Buttons/IconButton',
  component: IconButton,
} as ComponentMeta<typeof IconButton>;

Secondary.args = { color: 'secondary' } as SvgIconProps;
