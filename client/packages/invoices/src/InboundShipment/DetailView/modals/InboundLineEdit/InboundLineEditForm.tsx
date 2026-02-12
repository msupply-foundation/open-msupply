import React, { useMemo } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
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

  const existingItemIds = useMemo(() => {
    if (!data) return [];
    const stockLines = data.lines.nodes.filter(isA.stockInLine);
    return [...new Set(stockLines.map(line => line.item.id))];
  }, [data]);

  return (
    <>
      <ModalRow>
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
            filter={{ id: { notEqualAll: existingItemIds } }}
            // A scanned-in item will only have an ID, not a full item object,
            // so this flag makes the StockItemSearchInput component update the
            // current item on initial load from the API
            initialUpdate={!item?.name}
          />
        </Grid>
      </ModalRow>
      {item && (
        <ModalRow margin={3}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput
            disabled
            sx={{ width: 150 }}
            value={item.unitName ?? ''}
          />
        </ModalRow>
      )}
    </>
  );
};
