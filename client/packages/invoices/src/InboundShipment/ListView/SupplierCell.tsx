import React from 'react';
import {
  useNavigate,
  RouteBuilder,
  HomeIcon,
  TruckIcon,
  ColorSelectButton,
  InboundNodeType,
} from '@openmsupply-client/common';
import { Box, Link, Tooltip } from '@mui/material';
import { AppRoute } from '@openmsupply-client/config';
import { InboundRowFragment } from '../api';
import { isInboundDisabled } from '../../utils';

interface SupplierCellProps {
  row: InboundRowFragment;
  onColorChange: (patch: { id: string; colour: string }) => void;
}

export const SupplierCell = ({ row, onColorChange }: SupplierCellProps) => {
  const navigate = useNavigate();
  const external =
    row.inboundType === InboundNodeType.ManualExternal ||
    row.inboundType === InboundNodeType.FromPurchaseOrder;
  const KindIcon = external ? TruckIcon : HomeIcon;
  // Proper colors?
  const iconColor = external ? 'info.main' : 'primary.main';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ColorSelectButton
        disabled={isInboundDisabled(row)}
        onChange={color => onColorChange({ id: row.id, colour: color.hex })}
        color={row.colour}
      />
      {/* Translation? */}
      <Tooltip title={row.inboundType}>
        <Box sx={{ display: 'flex' }}>
          <KindIcon sx={{ fontSize: 16, color: iconColor }} />
        </Box>
      </Tooltip>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {row.otherPartyName}
        {row.purchaseOrder && (
          <Link
            component="button"
            variant="caption"
            sx={{
              whiteSpace: 'nowrap',
              textAlign: 'left',
              color: iconColor,
              width: 'fit-content',
            }}
            onClick={e => {
              e.stopPropagation();
              if (!row.purchaseOrder?.id) return;
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.PurchaseOrder)
                  .addPart(row.purchaseOrder.id)
                  .build()
              );
            }}
          >
            PO-{String(row.purchaseOrder?.number).padStart(4, '0')}
          </Link>
        )}
        {row.requisition && (
          <Link
            component="button"
            variant="caption"
            sx={{
              whiteSpace: 'nowrap',
              textAlign: 'left',
              color: iconColor,
              width: 'fit-content',
            }}
            onClick={e => {
              e.stopPropagation();
              if (!row.requisition?.id) return;
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InternalOrder)
                  .addPart(row.requisition.id)
                  .build()
              );
            }}
          >
            REQ-{String(row.requisition.requisitionNumber).padStart(4, '0')}
          </Link>
        )}
      </Box>
    </Box>
  );
};
