import React from 'react';
import {
  useNavigate,
  RouteBuilder,
  useTranslation,
} from '@openmsupply-client/common';
import { Box, Link } from '@mui/material';
import { AppRoute } from '@openmsupply-client/config';
import { InboundRowFragment } from '../api';
import { getInboundColorAndIcon } from './SupplierCell';

interface LinkedCellProps {
  row: InboundRowFragment;
}

export const LinkedCell = ({ row }: LinkedCellProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { purchaseOrder, requisition } = row;
  const { color: linkColor } = getInboundColorAndIcon(row.inboundType);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {purchaseOrder && (
        <Link
          component="button"
          variant="body2"
          sx={{
            whiteSpace: 'nowrap',
            textAlign: 'left',
            width: 'fit-content',
            color: linkColor,
          }}
          onClick={e => {
            e.stopPropagation();
            if (!purchaseOrder.id) return;
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.PurchaseOrder)
                .addPart(purchaseOrder.id)
                .build()
            );
          }}
        >
          {t('label.po-num', {
            number: String(purchaseOrder.number).padStart(3, '0'),
          })}
        </Link>
      )}
      {requisition && (
        <Link
          component="button"
          variant="body2"
          sx={{
            whiteSpace: 'nowrap',
            textAlign: 'left',
            width: 'fit-content',
            color: linkColor,
          }}
          onClick={e => {
            e.stopPropagation();
            if (!requisition.id) return;
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InternalOrder)
                .addPart(requisition.id)
                .build()
            );
          }}
        >
          {t('label.requisition-num', {
            number: String(requisition.requisitionNumber).padStart(3, '0'),
          })}
        </Link>
      )}
    </Box>
  );
};
