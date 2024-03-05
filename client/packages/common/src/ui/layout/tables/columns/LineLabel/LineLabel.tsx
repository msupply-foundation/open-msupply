import React from 'react';
import { RecordWithId } from '@common/types';
import { ColumnAlign, ColumnDefinition } from '../types';
import { useTranslation } from '@common/intl';

export const getLineLabelColumn = <
  T extends RecordWithId,
>(): ColumnDefinition<T> => ({
  key: 'lineLabel',
  sortable: false,
  align: ColumnAlign.Right,
  width: 100,
  Header: () => {
    return null;
  },

  Cell: ({ rowIndex }) => {
    const t = useTranslation();
    const label = t('label.line', { line: rowIndex + 1 });

    return <>{label}</>;
  },
});
