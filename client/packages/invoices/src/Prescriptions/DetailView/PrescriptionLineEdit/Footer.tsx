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
  hasNext: boolean;
  next: string | null;
  hasPrevious: boolean;
  previous: string | null;
  invoiceNumber?: number;
  loading: boolean;
  isDirty: boolean;
  handleSave: (onSaved: () => boolean | void) => Promise<boolean | void>;
}

export const Footer: FC<FooterProps> = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  invoiceNumber,
  loading,
  isDirty,
  handleSave,
}) => {
  const navigate = useNavigate();
  const { itemId } = useParams();

  // When saving, we need to navigate to the next or previous prescription line, but we'll get a not saved warning if we don't wait for the save to complete
  // Use effect gets around this issue (but is ugly)
  let [navigateTo, setNavigateTo] = useState<string | null>(null);

  useEffect(() => {
    if (navigateTo) {
      navigate(navigateTo);
      setNavigateTo(null);
    }
  }, [navigateTo, navigate]);

  return (
    <AppFooterPortal
      Content={
        loading ? (
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
                variant="previous"
                disabled={!hasPrevious}
                onClick={() => {
                  handleSave(() =>
                    setNavigateTo(
                      RouteBuilder.create(AppRoute.Dispensary)
                        .addPart(AppRoute.Prescription)
                        .addPart(String(invoiceNumber))
                        .addPart(String(previous))
                        .build()
                    )
                  );
                }}
              />
              <DialogButton
                variant={isDirty ? 'next-and-ok' : 'next'}
                disabled={itemId === 'new' && !isDirty}
                onClick={async () => {
                  const nextPath = hasNext ? String(next) : 'new';
                  handleSave(() =>
                    setNavigateTo(
                      RouteBuilder.create(AppRoute.Dispensary)
                        .addPart(AppRoute.Prescription)
                        .addPart(String(invoiceNumber))
                        .addPart(nextPath)
                        .build()
                    )
                  );
                }}
              />
            </Box>
          </Box>
        )
      }
    />
  );
};
