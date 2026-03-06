import React, { useMemo } from 'react';
import {
  ModalLabel,
  Grid,
  Box,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { useInboundShipment } from '../../../api/hooks/document/useInboundShipment';
import { isA } from '../../../../utils';
import { usePurchaseOrder } from '@openmsupply-client/purchasing/src/purchase_order/api';

interface InboundLineEditProps {
  item: ItemRowFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemStockOnHandFragment | null) => void;
}

export const InboundLineEditForm = ({
  item,
  disabled,
  onChangeItem,
}: InboundLineEditProps) => {
  const t = useTranslation();
  const {
    query: { data },
  } = useInboundShipment();
  const purchaseOrder = data?.purchaseOrder;

  const existingItemIds = useMemo(() => {
    if (!data) return [];
    const stockLines = data.lines.nodes.filter(isA.stockInLine);
    return [...new Set(stockLines.map(line => line.item.id))];
  }, [data]);

  const { query } = usePurchaseOrder(purchaseOrder?.id);
  const filter = {
    id: {
      notEqualAll: existingItemIds,
      ...purchaseOrder && {
        equalAny: query.data?.lines.nodes.map(line => line.item.id) || []
      },
    }
  };

  return (
    <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
      <Box display="flex" alignItems="center" flex={1} minWidth={300} gap={1}>
        <ModalLabel
          label={t('label.item', { count: 1 })}
          justifyContent="flex-end"
        />
        <Grid flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={newItem => onChangeItem(newItem)}
            filter={filter}
            // A scanned-in item will only have an ID, not a full item object,
            // so this flag makes the StockItemSearchInput component update the
            // current item on initial load from the API
            initialUpdate={!item?.name}
          />
        </Grid>
      </Box>
      {item && (
        <Box display="flex" alignItems="center" gap={1}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput
            disabled
            sx={{ width: 150 }}
            value={item.unitName ?? ''}
          />
        </Box>
      )}
    </Box>
  );
};
