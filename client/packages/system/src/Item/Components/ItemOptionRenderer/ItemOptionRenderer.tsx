import React from 'react';
import { ItemOption } from '../../utils';
import { Tooltip } from '@common/components';
import { ItemStockOnHandFragment, ItemsWithStatsFragment } from '../../api';

export const getItemOptionRenderer =
  (label: string, formatNumber: (value: number) => string) =>
  (
    props: React.HTMLAttributes<HTMLLIElement>,
    item: ItemStockOnHandFragment | ItemsWithStatsFragment
  ) => (
    <Tooltip title={`${item.code} ${item.name}`} key={item.id}>
      <ItemOption
        {...props}
        sx={{ justifyContent: 'space-between !important' }}
        key={item.code}
      >
        <span
          data-testid="item-option-code"
          style={{
            whiteSpace: 'nowrap',
            width: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.code}
        </span>
        <span data-testid="item-option-name" style={{ whiteSpace: 'normal', width: 500 }}>
          {item.name}
        </span>
        <span
          style={{
            width: 200,
            textAlign: 'right',
          }}
        >{`${formatNumber(item.availableStockOnHand)} ${label}`}</span>
      </ItemOption>
    </Tooltip>
  );
