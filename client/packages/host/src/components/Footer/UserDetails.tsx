import React, { FC, useState } from 'react';
import {
  Box,
  CircularProgress,
  FlatButton,
  PaperPopover,
  PaperPopoverSection,
  useAuthContext,
  useTranslation,
  useNavigate,
  useUserDetails,
  useConfirmationModal,
  RouteBuilder,
  PowerIcon,
  TextWithLabelRow,
  UNDEFINED_STRING_VALUE,
  useIntlUtils,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PropsWithChildrenOnly } from '@common/types';

export const UserDetails: FC<PropsWithChildrenOnly> = ({ children }) => {
  const { logout, user, token } = useAuthContext();
  const navigate = useNavigate();
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const { isLoading } = useUserDetails(token);
  const t = useTranslation();
  const { getLocalisedFullName } = useIntlUtils();
  const LABEL_WIDTH = 150;

  const handleLogout = () => {
    navigate(RouteBuilder.create(AppRoute.Login).build());
    logout();
  };

  const showConfirmation = useConfirmationModal({
    onConfirm: handleLogout,
    message: t('messages.logout-confirm'),
    title: t('heading.logout-confirm'),
  });

  const logoutButton = (
    <FlatButton
      startIcon={<PowerIcon fontSize="small" color="primary" />}
      label={t('logout')}
      onClick={async () => {
        setPopoverAnchor(null);
        showConfirmation();
      }}
      sx={{
        whiteSpace: 'nowrap',
        overflowX: 'hidden',
        overflowY: 'visible',
        textOverflow: 'ellipsis',
      }}
    />
  );

  return user ? (
    <PaperPopover
      mode="click"
      placement={{
        vertical: 'top',
        horizontal: 'center',
      }}
      anchorEl={popoverAnchor}
      onAnchorElChange={setPopoverAnchor}
      Content={
        <PaperPopoverSection
          label={getLocalisedFullName(user.firstName, user.lastName)}
        >
          {isLoading ? (
            <CircularProgress size={12} />
          ) : (
            <Box
              sx={{
                overflowY: 'auto',
                overflowX: 'auto',
                maxHeight: 300,
                margin: '.5rem',
              }}
            >
              <TextWithLabelRow
                label={t('heading.username')}
                text={user.name}
                textProps={{
                  textAlign: 'left',
                  lineHeight: 1.5,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                labelProps={{
                  sx: {
                    textAlign: 'left',
                    width: LABEL_WIDTH,
                    lineHeight: 1.5,
                  },
                }}
                showToolTip={true}
                sx={{ overflow: 'hidden' }}
              />
              <TextWithLabelRow
                label={t('label.email')}
                text={user.email ?? UNDEFINED_STRING_VALUE}
                textProps={{
                  textAlign: 'left',
                  lineHeight: 1.5,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                labelProps={{
                  sx: {
                    textAlign: 'left',
                    width: LABEL_WIDTH,
                    lineHeight: 1.5,
                  },
                }}
                showToolTip={true}
                sx={{ overflow: 'hidden' }}
              />
              <TextWithLabelRow
                label={t('label.job-title')}
                text={user.jobTitle ?? UNDEFINED_STRING_VALUE}
                textProps={{
                  textAlign: 'left',
                  lineHeight: 1.5,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                labelProps={{
                  sx: {
                    textAlign: 'left',
                    width: LABEL_WIDTH,
                    lineHeight: 1.5,
                  },
                }}
                showToolTip={true}
                sx={{ overflow: 'hidden' }}
              />
            </Box>
          )}
          {logoutButton}
        </PaperPopoverSection>
      }
    >
      {children}
    </PaperPopover>
  ) : (
    <></>
  );
};
