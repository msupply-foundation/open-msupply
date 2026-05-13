import React from 'react';
import { StoryFn } from '@storybook/react';
import { PaperPopover } from './PaperPopover';
import { UnhappyMan } from '@common/icons';
import { Typography } from '@mui/material';

export default {
  title: 'Popover/PaperPopover',
  component: PaperPopover,
};

const Example: StoryFn = () => {
  return (
    <>
      <PaperPopover mode="hover" Content={<UnhappyMan />}>
        <Typography>Hover me!</Typography>
      </PaperPopover>
      <PaperPopover mode="click" Content={<UnhappyMan />}>
        <Typography>Click me!</Typography>
      </PaperPopover>
    </>
  );
};

export const Primary = Example.bind({});
