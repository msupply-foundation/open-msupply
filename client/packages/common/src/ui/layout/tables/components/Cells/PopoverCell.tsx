import React, { ReactNode } from 'react';
import {
  MessageSquareIcon,
  PaperHoverPopover,
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
    <PaperHoverPopover
      width={400}
      Content={
        <PaperPopoverSection label={label}>
          <>{value}</>
        </PaperPopoverSection>
      }
    >
      <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
    </PaperHoverPopover>
  );
};
