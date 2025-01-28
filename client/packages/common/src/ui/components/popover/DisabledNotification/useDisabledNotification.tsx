import React from 'react';
import { PaperPopoverSection, usePaperClickPopover } from '../PaperPopover';
import { AlertIcon } from '../../../icons/Alert';
import { Typography } from '@mui/material';

export const useDisabledNotification = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => {
  const { hide, PaperClickPopover, show } = usePaperClickPopover();

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
