import React from 'react';
import { DomainObject } from '../../../../../types';
import { ColumnAlign, ColumnDefinition } from '../types';
import { MessageSquareIcon } from '../../../../icons';

interface DomainObjectWithComment extends DomainObject {
  comment?: string;
  updateComment: (rowId: string, comment: string) => void;
}

export const getCommentPopoverColumn = <
  T extends DomainObjectWithComment
>(): ColumnDefinition<T> => ({
  key: 'comment',
  sortable: false,
  align: ColumnAlign.Center,
  width: 20,
  accessor: rowData => rowData.comment,
  Header: () => {
    return null;
  },

  Cell: () => {
    return <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />;
  },
});
