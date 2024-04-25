import React from 'react';
import { PaperPopoverSection, usePaperClickPopover } from '../PaperPopover';
import { AlertIcon } from '../../../icons/Alert';
import { Typography } from '@mui/material';

export const useDisabledNotificationPopover = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => {
  const { hide, PaperClickPopover, show } = usePaperClickPopover();

  /**
   * Display a notification that the user is not allowed to perform an action
   * Uses a PaperClickPopover to display the notification, which allows for more
   * information than the useDisabledNotificationToast
   * @param title
   * @returns
   */
  const DisabledNotification = ({
    placement = 'bottom',
  }: {
    placement?: 'top' | 'bottom' | 'right' | 'left';
  }) => (
    <PaperClickPopover
      placement={placement}
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
