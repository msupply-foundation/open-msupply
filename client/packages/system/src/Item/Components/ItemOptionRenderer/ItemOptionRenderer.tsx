import React from 'react';
import { ItemRowWithStatsFragment, ItemStockOnHandFragment } from '../../api';
import { ItemOption } from '../../utils';
import { Tooltip } from '@common/components';

export const getItemOptionRenderer =
  (label: string, formatNumber: (value: number) => string) =>
  (
    props: React.HTMLAttributes<HTMLLIElement>,
    item: ItemStockOnHandFragment | ItemRowWithStatsFragment
  ) => (
    <Tooltip title={`${item.code} ${item.name}`}>
      <ItemOption {...props} key={item.code}>
        <span
          style={{
            whiteSpace: 'nowrap',
            width: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.code}
        </span>
        <span style={{ whiteSpace: 'normal', width: 500 }}>{item.name}</span>
        <span
          style={{
            width: 200,
            textAlign: 'right',
          }}
        >{`${formatNumber(item.availableStockOnHand)} ${label}`}</span>
      </ItemOption>
    </Tooltip>
  );
