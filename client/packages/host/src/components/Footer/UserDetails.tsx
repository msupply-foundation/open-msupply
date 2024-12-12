import React, { FC } from 'react';
import {
  Box,
  CircularProgress,
  FlatButton,
  PaperPopoverSection,
  useAuthContext,
  usePaperClickPopover,
  useTranslation,
  useNavigate,
  useUserDetails,
  useConfirmationModal,
  RouteBuilder,
  PowerIcon,
  TextWithLabelRow,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PropsWithChildrenOnly } from '@common/types';
import { Tooltip } from 'recharts';

export const UserDetails: FC<PropsWithChildrenOnly> = ({ children }) => {
  const { logout, user, token } = useAuthContext();
  const navigate = useNavigate();
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { isLoading } = useUserDetails(token);
  const t = useTranslation();

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
      disabled={false}
      onClick={async () => {
        hide();
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

  return user && Tooltip ? (
    <PaperClickPopover
      placement="top"
      width={300}
      Content={
        <PaperPopoverSection label={`${user.firstName} ${user.lastName}`}>
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
                  width: 150,
                }}
                labelProps={{
                  sx: { textAlign: 'left', width: 80, lineHeight: 1.5 },
                }}
                showToolTip={true}
              />
              <TextWithLabelRow
                label={t('label.email')}
                text={user.email ?? ''}
                textProps={{
                  textAlign: 'left',
                  lineHeight: 1.5,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  width: 180,
                }}
                labelProps={{
                  sx: { textAlign: 'left', width: 45, lineHeight: 1.5 },
                }}
                showToolTip={true}
              />
            </Box>
          )}
          {logoutButton}
        </PaperPopoverSection>
      }
    >
      {children}
    </PaperClickPopover>
  ) : (
    isLoading
  );
};
