import React, { useState } from 'react';
import { StoryFn } from '@storybook/react';
import Box from '@mui/material/Box';
import { BasePopover } from '../BasePopover';
import { BaseButton } from '../../buttons';
import { UnhappyMan } from '@common/icons';

type VirtualElement = { getBoundingClientRect: () => DOMRect };

export default {
  title: 'Popover/BasePopover',
  component: BasePopover,
};

const Example: StoryFn = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<VirtualElement | null>(null);

  const control: React.MouseEventHandler<HTMLButtonElement | HTMLDivElement> =
    e => {
      const rect = {
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY,
        right: e.clientX,
        width: 0,
        height: 0,
      } as DOMRect;

      if (!isOpen) {
        setAnchorEl({ getBoundingClientRect: () => rect });
      }

      setIsOpen(state => !state);
    };

  return (
    <>
      <BasePopover isOpen={isOpen} anchorEl={anchorEl}>
        <div />
      </BasePopover>
      <Box component="div" onMouseOver={control} onMouseLeave={control}>
        <UnhappyMan />
      </Box>
      <Box>
        <BaseButton onClick={control}>Click to toggle!</BaseButton>
      </Box>
    </>
  );
};

export const Primary = Example.bind({});
