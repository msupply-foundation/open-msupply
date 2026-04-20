import React, { useMemo } from 'react';
import {
  Autocomplete,
  ModalLabel,
  Grid,
  Box,
  Typography,
  useTranslation,
  BasicTextInput,
  PurchaseOrderLineStatusNode,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { useInboundShipment } from '../../../api/hooks/document/useInboundShipment';
import { isA } from '../../../../utils';
import { usePurchaseOrder } from '@openmsupply-client/purchasing/src/purchase_order/api';
import { PurchaseOrderLineFragment } from '@openmsupply-client/purchasing/src/purchase_order/api/operations.generated';

interface InboundLineEditFormProps {
  item: ItemRowFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemStockOnHandFragment | null) => void;
  // External (PO line) mode props
  hasPurchaseOrder?: boolean;
  selectedPOLine: PurchaseOrderLineFragment | null;
  onChangePOLine: (line: PurchaseOrderLineFragment | null) => void;
}

export const InboundLineEditForm = ({
  item,
  disabled,
  onChangeItem,
  hasPurchaseOrder = false,
  selectedPOLine,
  onChangePOLine,
}: InboundLineEditFormProps) => {
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

  // For internal mode: filter items
  const filter = {
    id: {
      notEqualAll: existingItemIds,
      ...(purchaseOrder && {
        equalAny: query.data?.lines.nodes.map(line => line.item.id) || [],
      }),
    },
  };

  // For external mode: available PO lines
  const availablePOLines = useMemo(() => {
    if (!hasPurchaseOrder || !query.data) return [];

    const existingPolIds = new Set(
      data?.lines.nodes
        .filter(isA.stockInLine)
        .map(line => line.purchaseOrderLine?.id)
        .filter(Boolean) ?? []
    );

    return query.data.lines.nodes.filter(
      pol =>
        pol.status !== PurchaseOrderLineStatusNode.Closed &&
        (!existingPolIds.has(pol.id) || pol.id === selectedPOLine?.id)
    );
  }, [query.data, data, selectedPOLine?.id, hasPurchaseOrder]);

  const remainingUnits =
    hasPurchaseOrder && selectedPOLine
      ? (selectedPOLine.adjustedNumberOfUnits ??
          selectedPOLine.requestedNumberOfUnits) -
        (selectedPOLine.shippedNumberOfUnits ?? 0)
      : null;

  if (hasPurchaseOrder) {
    return (
      <Box>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
          <Box
            display="flex"
            alignItems="center"
            flex={1}
            minWidth={300}
            gap={1}
          >
            <ModalLabel
              label={t('label.purchase-order-line')}
              justifyContent="flex-end"
            />
            <Grid flex={1}>
              <Autocomplete
                autoFocus={!selectedPOLine}
                disabled={disabled}
                options={availablePOLines}
                value={selectedPOLine}
                getOptionLabel={(option: PurchaseOrderLineFragment) => {
                  const qty =
                    option.adjustedNumberOfUnits ??
                    option.requestedNumberOfUnits;
                  return `#${option.lineNumber} ${option.item.name} (${option.item.code}) - ${qty} units`;
                }}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, line) => onChangePOLine(line ?? null)}
                width="100%"
              />
            </Grid>
          </Box>
          {selectedPOLine && (
            <Box display="flex" alignItems="center" gap={1}>
              <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
              <BasicTextInput
                disabled
                sx={{ width: 150 }}
                value={
                  selectedPOLine.unit ?? selectedPOLine.item.unitName ?? ''
                }
              />
            </Box>
          )}
        </Box>
        {remainingUnits != null && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, ml: 1 }}
          >
            {t('label.remaining-quantity-to-receive', {
              count: remainingUnits,
            })}
          </Typography>
        )}
      </Box>
    );
  }

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
