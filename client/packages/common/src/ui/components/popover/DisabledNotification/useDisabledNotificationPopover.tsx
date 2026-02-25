import React from 'react';
import { PaperPopoverSection, usePaperPopover } from '../PaperPopover';
import { AlertIcon } from '../../../icons/Alert';
import { Typography } from '@mui/material';

export const useDisabledNotificationPopover = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => {
  const { hide, PaperPopover, show } = usePaperPopover();

  /**
   * Display a notification that the user is not allowed to perform an action
   * Uses a PaperPopover to display the notification, which allows for more
   * information than the useDisabledNotificationToast
   * @param title
   * @returns
   */
  const DisabledNotification = () => (
    <PaperPopover
      mode="click"
      width={250}
      Content={
        <PaperPopoverSection
          label={title}
          labelStyle={{ width: '100%' }}
          alignItems="center"
          Icon={<AlertIcon fontSize="small" color="primary" />}
          onClick={hide}
        >
          <Typography flex={1}>{message}</Typography>
        </PaperPopoverSection>
      }
    />
  );

  return { hide, show, DisabledNotification };
};
