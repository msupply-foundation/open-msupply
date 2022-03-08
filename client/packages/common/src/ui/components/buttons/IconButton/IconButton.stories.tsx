import React from 'react';
import { Box } from '@mui/material';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { IconButton } from '.';
import { BookIcon, SvgIconProps } from '@common/icons';

const Template: ComponentStory<React.FC<SvgIconProps>> = args => (
  <Box>
    <IconButton
      icon={<BookIcon {...args} />}
      label="Docs"
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
