import React from 'react';
import { BasicModal, DialogButton } from '@common/components';
import { Box } from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

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
}: ConfirmationModalProps) =>
  open ? (
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
          // Served alongside the frontend bundle, so it needs the build-time
          // base path (Environment.PUBLIC_PATH, '/old-ui/' for the dual-FE build)
          // to resolve when the old UI is served from a sub-path.
          src={`${Environment.PUBLIC_PATH}game/index.html`}
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
  ) : null;
