import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useResponseLines, ResponseLineFragment } from '../api';
import { RegexUtils } from '@openmsupply-client/common';

interface ContentAreaProps {
  onRowClick: null | ((line: ResponseLineFragment) => void);
  itemFilter: string;
}

export const ContentArea = ({ onRowClick, itemFilter }: ContentAreaProps) => {
  const { columns, lines } = useResponseLines();
  const t = useTranslation('common');

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
