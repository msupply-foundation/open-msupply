import React from 'react';
import { StoryFn } from '@storybook/react';
import Box from '@mui/material/Box';
import { BasePopover } from '../BasePopover';
import { BaseButton } from '../../buttons';
import { useDisabledNotificationPopover } from './useDisabledNotificationPopover';
import { useDisabledNotificationToast } from './useDisabledNotificationToast';

export default {
  title: 'Popover/DisabledNotification',
  component: BasePopover,
};

const Example: StoryFn = () => {
  const { show, DisabledNotification } = useDisabledNotificationPopover({
    title: 'Permission denied',
    message: 'You do not have permission to perform this action.',
  });

  const showToast = useDisabledNotificationToast(
    'You do not have permission to perform this action.'
  );

  return (
    <>
      <DisabledNotification />
      <Box>
        <BaseButton onClick={show}>Click this button.. if you dare!</BaseButton>
        <div>You can click the message to close it.</div>
      </Box>
      <Box>
        <BaseButton onClick={showToast}>
          For a toast version, click this one
        </BaseButton>
      </Box>
    </>
  );
};

export const Primary = Example.bind({});
