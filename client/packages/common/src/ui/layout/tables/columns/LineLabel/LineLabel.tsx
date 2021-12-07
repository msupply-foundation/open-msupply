import React from 'react';
import { DomainObject } from '@common/types';
import { ColumnAlign, ColumnDefinition } from '../types';
import { useTranslation } from '@common/intl';

export const getLineLabelColumn = <
  T extends DomainObject
>(): ColumnDefinition<T> => ({
  key: 'lineLabel',
  sortable: false,
  align: ColumnAlign.Right,
  width: 100,
  Header: () => {
    return null;
  },

  Cell: ({ rowIndex }) => {
    const t = useTranslation('common');
    const label = t('label.line', { line: rowIndex + 1 });

    return <>{label}</>;
  },
});
