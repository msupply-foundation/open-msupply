import React, { ReactNode } from 'react';
import {
  MessageSquareIcon,
  PaperPopover,
  PaperPopoverSection,
} from '@openmsupply-client/common';

export const PopoverCell = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => {
  if (!value) return null;

  return (
    <PaperPopover
      mode="hover"
      width={400}
      placement={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      Content={
        <PaperPopoverSection label={label}>
          <>{value}</>
        </PaperPopoverSection>
      }
    >
      <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
    </PaperPopover>
  );
};
