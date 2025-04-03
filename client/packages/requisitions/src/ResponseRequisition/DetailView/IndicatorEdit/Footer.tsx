import React from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  RouteBuilder,
  useNavigate,
  useParams,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IndicatorLineRowFragment } from '../../../RequestRequisition/api';

interface FooterProps {
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  requisitionId?: string;
  scrollIntoView: () => void;
}

export const Footer = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  requisitionId,
  scrollIntoView,
}: FooterProps) => {
  const navigate = useNavigate();
  const { programIndicatorCode } = useParams();

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
              onClick={() => {
                navigate(
                  RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.CustomerRequisition)
                    .addPart(String(requisitionId))
                    .addPart(AppRoute.Indicators)
                    .addPart(String(programIndicatorCode))
                    .addPart(String(previous?.id))
                    .build()
                );
                scrollIntoView();
              }}
            />
            <DialogButton
              variant="next"
              disabled={!hasNext}
              onClick={() => {
                navigate(
                  RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.CustomerRequisition)
                    .addPart(String(requisitionId))
                    .addPart(AppRoute.Indicators)
                    .addPart(String(programIndicatorCode))
                    .addPart(String(next?.id))
                    .build()
                );
                scrollIntoView();
              }}
            />
          </Box>
        </Box>
      }
    />
  );
};
