import React from 'react';
import { styled } from '@openmsupply-client/common';
import { ItemLike } from './types';
import { ItemRowFragment, ItemRowWithStatsFragment } from './api';

export const toItemRow = (line: ItemLike): ItemRowFragment => ({
  __typename: 'ItemNode',
  id: 'lines' in line ? line.lines[0].item.id : line.item.id,
  name: 'lines' in line ? line.lines[0].item.name : line.item.name,
  code: 'lines' in line ? line.lines[0].item.code : line.item.code,
  unitName:
    ('lines' in line ? line.lines[0].item?.unitName : line.item?.unitName) ??
    '',
});

export const filterOptions = {
  stringify: (item: ItemRowFragment) => `${item.code} ${item.name}`,
  limit: 100,
};

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

export const getOptionRenderer =
  (label: string, formatNumber: (value: number) => string) =>
  (
    props: React.HTMLAttributes<HTMLLIElement>,
    item: ItemRowWithStatsFragment
  ) =>
    (
      <ItemOption {...props} key={item.code}>
        <span style={{ whiteSpace: 'nowrap', width: 100 }}>{item.code}</span>
        <span style={{ whiteSpace: 'nowrap', width: 500 }}>{item.name}</span>
        <span
          style={{
            width: 200,
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >{`${formatNumber(item.stats.availableStockOnHand)} ${label}`}</span>
      </ItemOption>
    );
