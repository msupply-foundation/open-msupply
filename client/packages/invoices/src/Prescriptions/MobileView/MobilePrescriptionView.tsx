import {
  BaseButton,
  Box,
  FnUtils,
  RouteBuilder,
  Stack,
  Typography,
  useHostContext,
  useNavigate,
  useParams,
} from 'packages/common/src';
import { AppRoute } from 'packages/config/src';
import React, { FC, useEffect } from 'react';

const PrescriptionComponent: FC = () => {
  const { fullScreen, setFullScreen } = useHostContext();
  const { invoiceNumber } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!fullScreen) {
      setFullScreen(true);
    }
  }, [fullScreen]);

  return (
    <Stack spacing={5}>
      <Typography sx={{ textAlign: 'center' }} variant="h3">
        New Prescription
      </Typography>
      <Box display="flex" justifyContent="center" gap={2}>
        <BaseButton
          onClick={() => {
            alert('Not Implemented');
          }}
        >
          Enter Manually
        </BaseButton>
        <Box display="flex" justifyContent="center">
          <BaseButton
            onClick={() => {
              navigate(
                RouteBuilder.create(AppRoute.Dispensary)
                  .addPart(AppRoute.Mobile)
                  .addPart(AppRoute.Prescription)
                  .addPart(invoiceNumber ?? 'NO_INVOICE_NUMBER')
                  .addPart('scan')
                  .build()
              );
            }}
          >
            Scan
          </BaseButton>
        </Box>
      </Box>
    </Stack>
  );
};

export const MobilePrescriptionView: FC = () => <PrescriptionComponent />;
