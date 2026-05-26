import React from 'react';
import {
  AppBarContentPortal,
  Box,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { useInboundShipment } from '../api';

export const MobileToolbar = () => {
  const t = useTranslation();
  const {
    query: { data: shipment },
  } = useInboundShipment();

  // Don't render anything if there's no content to show
  if (!shipment?.otherPartyName && !shipment?.theirReference) {
    return null;
  }

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '4px 8px',
        fontSize: '0.75rem',
      }}
    >
      {shipment?.otherPartyName && (
        <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t('label.supplier')}:
          </Typography>
          <Typography variant="caption" component="span" fontWeight="medium">
            {shipment.otherPartyName}
          </Typography>
        </Box>
      )}
      {shipment?.theirReference && (
        <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t('label.reference')}:
          </Typography>
          <Typography variant="caption" component="span" fontWeight="medium">
            {shipment.theirReference}
          </Typography>
        </Box>
      )}
    </AppBarContentPortal>
  );
};
