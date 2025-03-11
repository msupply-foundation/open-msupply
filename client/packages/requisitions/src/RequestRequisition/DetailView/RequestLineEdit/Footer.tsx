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
                navigate(buildItemEditRoute(requisitionId, previous?.id));
                scrollIntoView();
              }}
            />
            <DialogButton
              variant="next"
              disabled={!hasNext}
              onClick={() => {
                navigate(buildItemEditRoute(requisitionId, next?.id));
                scrollIntoView();
              }}
            />
          </Box>
        </Box>
      }
    />
  );
};
