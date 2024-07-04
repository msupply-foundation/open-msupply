import React from 'react';
import { Box } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { IconButton } from './IconButton';
import { BookIcon, SvgIconProps } from '@common/icons';

const Template: StoryFn<React.FC<SvgIconProps>> = args => (
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
} as Meta<typeof IconButton>;

Secondary.args = { color: 'secondary' } as SvgIconProps;
