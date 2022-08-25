import React, { FC } from 'react';
import {
  Box,
  useTranslation,
  AppFooterPortal,
  ButtonWithIcon,
  CheckIcon,
  XCircleIcon,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from 'packages/config/src';

interface FooterProps {
  isDisabled: boolean;
  onSave: () => void;
}

export const Footer: FC<FooterProps> = ({ isDisabled, onSave }) => {
  const t = useTranslation('common');
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
          <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
            <ButtonWithIcon
              variant="outlined"
              color="secondary"
              Icon={<XCircleIcon />}
              onClick={() =>
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Encounter)
                    .build()
                )
              }
              label={t('button.cancel')}
            />
            <ButtonWithIcon
              variant="outlined"
              color="secondary"
              Icon={<CheckIcon />}
              onClick={onSave}
              label={t('button.save')}
              disabled={isDisabled}
            />
          </Box>
        </Box>
      }
    />
  );
};
