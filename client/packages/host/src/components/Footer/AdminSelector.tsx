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
  Typography,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PropsWithChildrenOnly } from '@common/types';

export const AdminSelector: FC<PropsWithChildrenOnly> = ({ children }) => {
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
      key={null}
      sx={{
        whiteSpace: 'nowrap',
        overflowX: 'hidden',
        overflowY: 'visible',
        textOverflow: 'ellipsis',
      }}
    />
  );
  return (
    <PaperClickPopover
      placement="top"
      width={300}
      Content={
        <PaperPopoverSection label={`${user?.firstName} ${user?.lastName}`}>
          {isLoading ? (
            <CircularProgress size={12} />
          ) : (
            <Box
              style={{
                overflowY: 'auto',
                maxHeight: 300,
                gap: 10,
              }}
            >
              <Typography>Username: {user?.name}</Typography>
              <Typography>Email: {user?.email}</Typography>
            </Box>
          )}
          {logoutButton}
        </PaperPopoverSection>
      }
    >
      {children}
    </PaperClickPopover>
  );
};

// TODO: tidy up popover styling + rename components if need be
