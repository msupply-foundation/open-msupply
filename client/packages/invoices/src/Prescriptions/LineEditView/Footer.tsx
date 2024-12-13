import React, { FC, useEffect, useState } from 'react';
import {
  Box,
  AppFooterPortal,
  DialogButton,
  RouteBuilder,
  useNavigate,
  InlineSpinner,
  useParams,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

interface FooterProps {
  isSaving: boolean;
  isDirty: boolean;
  handleSave: () => Promise<boolean | void>;
}

export const Footer: FC<FooterProps> = ({ isSaving, isDirty, handleSave }) => {
  const { itemId } = useParams();

  return (
    <AppFooterPortal
      Content={
        isSaving ? (
          <InlineSpinner />
        ) : (
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
                variant="cancel"
                // disabled={!hasPrevious}
                onClick={() => {
                  // TO-DO
                }}
              />
              <DialogButton
                variant={'save'}
                disabled={itemId === 'new' && !isDirty}
                onClick={handleSave}
              />
            </Box>
          </Box>
        )
      }
    />
  );
};
