import React from "react";
import { ItemRowWithStatsFragment, ItemStockOnHandFragment } from "../../api";
import { ItemOption } from "../../utils";

export const getItemOptionRenderer =
  (label: string, formatNumber: (value: number) => string) =>
  (props: React.HTMLAttributes<HTMLLIElement>, item: ItemStockOnHandFragment | ItemRowWithStatsFragment) =>
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
        >{`${formatNumber(item.availableStockOnHand)} ${label}`}</span>
      </ItemOption>
    );
