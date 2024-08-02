import React from 'react';
import { StoryFn } from '@storybook/react';
import { HoverPopover } from './HoverPopover';
import { UnhappyMan } from '@common/icons';
import { Box } from '@mui/material';
import { Typography } from '@mui/material';

export default {
  title: 'Popover/HoverPopover',
  component: HoverPopover,
};

const Example: StoryFn = () => {
  return (
    <>
      <HoverPopover
        Content={
          <Box>
            <UnhappyMan />
          </Box>
        }
      >
        <Box
          width={300}
          height={300}
          bgcolor="aqua"
          justifyContent="center"
          alignItems="center"
        >
          <Typography>Hover me!</Typography>
        </Box>
      </HoverPopover>
    </>
  );
};

export const Primary = Example.bind({});
