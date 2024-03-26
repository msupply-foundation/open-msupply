import React from 'react';
import { BasicModal, DialogButton } from '@common/components';
import { Box } from '@openmsupply-client/common';

interface ConfirmationModalProps {
  open: boolean;
  width?: number;
  height?: number;
  onCancel: () => void;
}

export const EasterEggModal = ({
  onCancel,
  open,
  width = 650,
  height = 300,
}: ConfirmationModalProps) => {
  return (
    <BasicModal width={width} height={height} open={open}>
      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        alignItems="center"
        padding={4}
        sx={{ backgroundColor: '#f7f7f7' }}
      >
        <iframe
          src="/game/index.html"
          style={{
            width: 600,
            height: 250,
            border: 0,
          }}
          onLoad={() => focus()}
        ></iframe>
        <Box>
          <DialogButton variant="cancel" onClick={onCancel} />
        </Box>
      </Box>
    </BasicModal>
  );
};
