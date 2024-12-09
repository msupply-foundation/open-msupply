import React, { FC } from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

interface FooterProps {
  hasNext: boolean;
  next: string | null;
  hasPrevious: boolean;
  previous: string | null;
  invoiceNumber?: number;
}

export const Footer: FC<FooterProps> = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  invoiceNumber,
}) => {
  const navigate = useNavigate();

  return (
    <AppFooterPortal
      Content={
        <Box
          gap={2}
          display="flex"
          flexDirection="row"
          alignItems="center"
          height={64}
        >
          <Box
            flex={1}
            display="flex"
            justifyContent="flex-end"
            gap={2}
            marginLeft="auto"
          >
            <DialogButton
              variant="previous"
              disabled={!hasPrevious}
              onClick={() =>
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Prescription)
                    .addPart(String(invoiceNumber))
                    .addPart(String(previous))
                    .build()
                )
              }
            />
            <DialogButton
              variant="next"
              disabled={!hasNext}
              onClick={() =>
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Prescription)
                    .addPart(String(invoiceNumber))
                    .addPart(String(next))
                    .build()
                )
              }
            />
          </Box>
        </Box>
      }
    />
  );
};
