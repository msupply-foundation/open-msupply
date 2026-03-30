import React from 'react';
import { Box, Typography } from '@openmsupply-client/common';
import { BasicModal } from '@common/components';

type DetectedContext =
  | 'REQUISITION'
  | 'INBOUND_SHIPMENT'
  | 'OUTBOUND_SHIPMENT'
  | 'PRESCRIPTION'
  | 'STOCKTAKE'
  | 'PURCHASE_ORDER'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | null;

const contextOptions: { label: string; value: DetectedContext }[] = [
  { label: 'Requisition', value: 'REQUISITION' },
  { label: 'Inbound Shipment', value: 'INBOUND_SHIPMENT' },
  { label: 'Outbound Shipment', value: 'OUTBOUND_SHIPMENT' },
  { label: 'Prescription', value: 'PRESCRIPTION' },
  { label: 'Stocktake', value: 'STOCKTAKE' },
  { label: 'Purchase Order', value: 'PURCHASE_ORDER' },
  { label: 'Customer Return', value: 'CUSTOMER_RETURN' },
  { label: 'Supplier Return', value: 'SUPPLIER_RETURN' },
];

interface NewReportModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (context: DetectedContext) => void;
}

export const NewReportModal = ({ open, onClose, onSelect }: NewReportModalProps) => (
  <BasicModal open={open} onClose={onClose} width={400} height={420}>
    <Box padding={3}>
      <Typography variant="h5" marginBottom={2}>
        New Report
      </Typography>
      <Typography variant="body2" color="textSecondary" marginBottom={2}>
        Choose the type of record this report is for:
      </Typography>

      {contextOptions.map(option => (
        <Box
          key={String(option.value)}
          onClick={() => {
            onSelect(option.value);
            onClose();
          }}
          sx={{
            px: 2,
            py: 1.25,
            cursor: 'pointer',
            borderRadius: 1,
            fontSize: '0.9rem',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {option.label}
        </Box>
      ))}
    </Box>
  </BasicModal>
);
