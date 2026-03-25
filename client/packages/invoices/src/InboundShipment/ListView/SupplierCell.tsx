import React from 'react';
import {
  HomeIcon,
  TruckIcon,
  ColorSelectButton,
  InboundNodeType,
  useTranslation,
  LocaleKey,
} from '@openmsupply-client/common';
import { Box, Tooltip } from '@mui/material';
import { InboundRowFragment } from '../api';
import { isInboundDisabled } from '../../utils';

export const inboundTypeTranslation: Record<InboundNodeType, LocaleKey> = {
  [InboundNodeType.FromPurchaseOrder]: 'label.inbound-type-from-purchase-order',
  [InboundNodeType.FromRequisition]: 'label.inbound-type-from-requisition',
  [InboundNodeType.ManualExternal]: 'label.inbound-type-manual-external',
  [InboundNodeType.ManualInternal]: 'label.inbound-type-manual-internal',
};

export const getInboundColorAndIcon = (inboundType: InboundNodeType) => {
  const external =
    inboundType === InboundNodeType.ManualExternal ||
    inboundType === InboundNodeType.FromPurchaseOrder;
  return {
    icon: external ? TruckIcon : HomeIcon,
    color: external ? 'info.main' : 'primary.main',
  };
};

interface SupplierCellProps {
  row: InboundRowFragment;
  onColorChange: (patch: { id: string; colour: string }) => void;
}

export const SupplierCell = ({ row, onColorChange }: SupplierCellProps) => {
  const t = useTranslation();
  const { icon: KindIcon, color: iconColor } = getInboundColorAndIcon(
    row.inboundType
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ColorSelectButton
        disabled={isInboundDisabled(row)}
        onChange={color => onColorChange({ id: row.id, colour: color.hex })}
        color={row.colour}
      />
      <Tooltip title={t(inboundTypeTranslation[row.inboundType])}>
        <Box sx={{ display: 'flex' }}>
          <KindIcon sx={{ fontSize: 16, color: iconColor }} />
        </Box>
      </Tooltip>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {row.otherPartyName}
      </Box>
    </Box>
  );
};
