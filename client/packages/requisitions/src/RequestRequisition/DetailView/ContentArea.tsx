import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { RequestLineFragment, useRequestLines } from '../api';
import { RegexUtils } from '@openmsupply-client/common';

interface ContentAreaProps {
  onRowClick: null | ((line: RequestLineFragment) => void);
  itemFilter: string;
}

export const ContentArea = ({ onRowClick, itemFilter }: ContentAreaProps) => {
  const t = useTranslation('common');
  const { lines, columns } = useRequestLines();

  const filterLines = () =>
    lines.filter(({ item: { name } }) =>
      RegexUtils.matchSubstring(itemFilter, name)
    );

  return (
    <DataTable
      onRowClick={onRowClick}
      columns={columns}
      data={filterLines()}
      noDataMessage={t('error.no-items')}
    />
  );
};
