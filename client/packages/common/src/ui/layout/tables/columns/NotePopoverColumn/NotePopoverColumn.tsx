import React from 'react';
import { DomainObject } from '@common/types';
import { ColumnAlign, ColumnDefinition } from '../types';
import { MessageSquareIcon } from '../../../../icons';
import {
  PaperPopover,
  PaperPopoverSection,
} from '../../../../components/popover';
import { useTranslation } from '@common/intl';

interface DomainObjectWithComment extends DomainObject {
  note?: string | null;
}

export const getNotePopoverColumn = <T extends DomainObjectWithComment>(
  label?: string
): ColumnDefinition<T> => ({
  key: 'comment',
  sortable: false,
  align: ColumnAlign.Center,
  width: 60,
  accessor: rowData => rowData.note,
  Header: () => {
    return null;
  },

  Cell: props => {
    const t = useTranslation('common');
    const value = props.column.accessor(props.rowData);

    return value ? (
      <PaperPopover
        width={400}
        height={180}
        Content={
          <PaperPopoverSection label={label ?? t('label.notes')}>
            {String(value)}
          </PaperPopoverSection>
        }
      >
        <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
      </PaperPopover>
    ) : null;
  },
});
