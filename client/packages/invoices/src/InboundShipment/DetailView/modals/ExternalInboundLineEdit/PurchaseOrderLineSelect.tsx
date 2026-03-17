import React, { useMemo } from 'react';
import {
  Autocomplete,
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
  PurchaseOrderLineStatusNode,
} from '@openmsupply-client/common';
import { useInboundShipment } from '../../../api/hooks/document/useInboundShipment';
import { isA } from '../../../../utils';
import { usePurchaseOrder } from '@openmsupply-client/purchasing/src/purchase_order/api';
import { PurchaseOrderLineFragment } from '@openmsupply-client/purchasing/src/purchase_order/api/operations.generated';

interface PurchaseOrderLineSelectProps {
  disabled: boolean;
  selectedLine: PurchaseOrderLineFragment | null;
  onChange: (line: PurchaseOrderLineFragment | null) => void;
}

export const PurchaseOrderLineSelect = ({
  disabled,
  selectedLine,
  onChange,
}: PurchaseOrderLineSelectProps) => {
  const t = useTranslation();
  const {
    query: { data },
  } = useInboundShipment();
  const purchaseOrder = data?.purchaseOrder;

  const { query } = usePurchaseOrder(purchaseOrder?.id);

  const availableLines = useMemo(() => {
    if (!query.data) return [];

    // PO line IDs already associated with invoice lines on this shipment
    const existingPolIds = new Set(
      data?.lines.nodes
        .filter(isA.stockInLine)
        .map(line => line.purchaseOrderLine?.id)
        .filter(Boolean) ?? []
    );

    return query.data.lines.nodes.filter(
      pol =>
        pol.status !== PurchaseOrderLineStatusNode.Closed &&
        // Show if not already used, or if it's the currently selected line (edit mode)
        (!existingPolIds.has(pol.id) || pol.id === selectedLine?.id)
    );
  }, [query.data, data, selectedLine?.id]);

  return (
    <>
      <ModalRow>
        <ModalLabel
          label={t('label.purchase-order-line')}
          justifyContent="flex-end"
        />
        <Grid flex={1}>
          <Autocomplete
            autoFocus={!selectedLine}
            disabled={disabled}
            options={availableLines}
            value={selectedLine}
            getOptionLabel={(option: PurchaseOrderLineFragment) => {
              const qty =
                option.adjustedNumberOfUnits ?? option.requestedNumberOfUnits;
              return `#${option.lineNumber} ${option.item.name} (${option.item.code}) - ${qty} units`;
            }}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, line) => onChange(line ?? null)}
            width="100%"
          />
        </Grid>
      </ModalRow>
      {selectedLine && (
        <ModalRow margin={3}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput
            disabled
            sx={{ width: 150 }}
            value={selectedLine.unit ?? selectedLine.item.unitName ?? ''}
          />
        </ModalRow>
      )}
    </>
  );
};
