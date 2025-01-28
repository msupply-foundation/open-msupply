import React from 'react';
import { StoryFn } from '@storybook/react';
import Box from '@mui/material/Box';
import { BasePopover } from '../BasePopover';
import { BaseButton } from '../../buttons';
import { useDisabledNotification } from './useDisabledNotification';

export default {
  title: 'Popover/DisabledNotification',
  component: BasePopover,
};

const Example: StoryFn = () => {
  const { show, DisabledNotification } = useDisabledNotification({
    title: 'Permission denied',
    message: 'You do not have permission to perform this action.',
  });
  return (
    <>
      <DisabledNotification />
      <Box>
        <BaseButton onClick={show}>Click this button.. if you dare!</BaseButton>
        <div>You can click the message to close it.</div>
      </Box>
    </>
  );
};

export const Primary = Example.bind({});
