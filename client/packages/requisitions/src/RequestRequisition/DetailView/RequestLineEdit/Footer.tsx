import React from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  useNavigate,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { buildItemEditRoute } from '../utils';

interface FooterProps {
  hasNext: boolean;
  next: ItemRowFragment | null;
  hasPrevious: boolean;
  previous: ItemRowFragment | null;
  requisitionNumber?: number;
}

export const Footer = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  requisitionNumber,
}: FooterProps) => {
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
                navigate(buildItemEditRoute(requisitionNumber, previous?.id))
              }
            />
            <DialogButton
              variant="next"
              disabled={!hasNext}
              onClick={() =>
                navigate(buildItemEditRoute(requisitionNumber, next?.id))
              }
            />
          </Box>
        </Box>
      }
    />
  );
};
