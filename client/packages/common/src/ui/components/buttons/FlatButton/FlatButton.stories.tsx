import React from 'react';
import { Box } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { FlatButton } from './FlatButton';
import { BookIcon, FilterIcon } from '@common/icons';

const Template: StoryFn<typeof FlatButton> = args => (
  <Box>
    <FlatButton
      {...args}
      startIcon={<BookIcon color={args.color} />}
      label={args.label ?? 'Docs'}
      onClick={() => console.info('clicked')}
    />
  </Box>
);

const StyledTemplate: StoryFn<typeof FlatButton> = args => (
  <Box>
    <FlatButton
      {...args}
      endIcon={<FilterIcon fontSize="small" />}
      label={args.label ?? 'View Filters'}
      onClick={() => console.info('clicked')}
      sx={{
        color: 'gray.main',
        fontSize: '10px',
        fontWeight: 500,
        '& .MuiSvgIcon-root': {
          color: 'gray.light',
          height: '18px',
          width: '18px',
        },
      }}
    />
  </Box>
);

export const Primary = Template.bind({});
export const Secondary = Template.bind({});
export const Styled = StyledTemplate.bind({});

export default {
  title: 'Buttons/FlatButton',
  component: FlatButton,
} as Meta<typeof FlatButton>;

Secondary.args = { color: 'secondary' };
