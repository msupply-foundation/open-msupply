import React from 'react';
import { RecordWithId } from '@common/types';
import { ColumnAlign, ColumnDefinition } from '../types';
import { MessageSquareIcon } from '@common/icons';
import { PaperHoverPopover, PaperPopoverSection } from '@common/components';
import { useTranslation } from '@common/intl';

export const getCommentPopoverColumn = <T extends RecordWithId>(
  label?: string
): ColumnDefinition<T> => ({
  key: 'comment',
  sortable: false,
  align: ColumnAlign.Center,
  width: 60,
  Header: () => {
    return null;
  },

  Cell: ({ column, rowData }) => {
    const t = useTranslation();
    const value = column.accessor({ rowData });

    return value ? (
      <PaperHoverPopover
        width={400}
        Content={
          <PaperPopoverSection label={label ?? t('label.comment')}>
            {String(value)}
          </PaperPopoverSection>
        }
      >
        <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
      </PaperHoverPopover>
    ) : null;
  },
});
