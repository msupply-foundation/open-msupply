import React, { FC } from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';

interface FooterProps {
  hasNext: boolean;
  next: ItemRowFragment | null;
  hasPrevious: boolean;
  previous: ItemRowFragment | null;
  requisitionNumber?: number;
}

export const Footer: FC<FooterProps> = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  requisitionNumber,
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
                  RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.CustomerRequisition)
                    .addPart(String(requisitionNumber))
                    .addPart(String(previous?.id))
                    .build(),
                  { replace: true }
                )
              }
            />
            <DialogButton
              variant="next"
              disabled={!hasNext}
              onClick={() =>
                navigate(
                  RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.CustomerRequisition)
                    .addPart(String(requisitionNumber))
                    .addPart(String(next?.id))
                    .build(),
                  { replace: true }
                )
              }
            />
          </Box>
        </Box>
      }
    />
  );
};
