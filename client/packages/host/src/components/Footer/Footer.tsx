import React, { FC, ReactNode } from 'react';
import {
  Box,
  HomeIcon,
  useIntlUtils,
  styled,
  Tooltip,
  TranslateIcon,
  Typography,
  useAuthContext,
  UserIcon,
  useTranslation,
  useIsCentralServerApi,
  CentralIcon,
  useEditModal,
  EditIcon,
  SxProps,
  useAppTheme,
  useMediaQuery,
  Breakpoints,
} from '@openmsupply-client/common';
import { StoreSelector } from './StoreSelector';
import { LanguageSelector } from './LanguageSelector';
import { StoreEditModal } from '@openmsupply-client/system';
import { UserDetails } from './UserDetails';

interface PaddedCellProps {
  sx?: SxProps;
  text?: string;
  icon: ReactNode;
  tooltip?: string;
  onClick?: () => void;
}

const PaddedCell: FC<PaddedCellProps> = ({
  sx,
  text,
  icon,
  tooltip,
  onClick,
}) => {
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(
    theme.breakpoints.down(Breakpoints.sm)
  );
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: isExtraSmallScreen ? 'column' : 'row',
        cursor: onClick ? 'pointer' : 'inherit',
        ...sx,
      }}
    >
      {icon}
      {text && (
        <Tooltip title={tooltip || ''}>
          <Typography
            sx={{
              color: 'inherit',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              width: isExtraSmallScreen ? '60px' : 'inherit',
              fontSize: isExtraSmallScreen ? '8px' : '12px',
              marginInlineStart: isExtraSmallScreen ? 0 : '8px',
            }}
          >
            {text}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
};

export const Footer = ({ backgroundColor }: { backgroundColor?: string }) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(
    theme.breakpoints.down(Breakpoints.sm)
  );
  const { user, store } = useAuthContext();
  const { currentLanguageName, getLocalisedFullName } = useIntlUtils();

  const isCentralServer = useIsCentralServerApi();
  const { isOpen, onClose, onOpen } = useEditModal();

  const Divider = styled(Box)({
    width: '1px',
    height: '24px',
    backgroundColor:
      backgroundColor ?? (isCentralServer ? '#fff' : theme.palette.gray.main),
  });

  const iconStyles = {
    color: 'inherit',
    height: isExtraSmallScreen ? 24 : 16,
    width: isExtraSmallScreen ? 24 : 16,
  };

  return (
    <Box
      gap={isExtraSmallScreen ? 0 : 2}
      display="flex"
      alignItems="center"
      px={0}
      py={isExtraSmallScreen ? 1.5 : 0.75}
      justifyContent={isExtraSmallScreen ? 'space-evenly' : 'inherit'}
    >
      <StoreSelector>
        <PaddedCell
          icon={<HomeIcon sx={iconStyles} />}
          text={store?.name}
          tooltip={t('store-details', { ...store })}
        />
      </StoreSelector>
      <PaddedCell
        icon={<EditIcon sx={iconStyles} />}
        text={t('label.edit')}
        tooltip={t('label.edit-store-properties')}
        onClick={onOpen}
      />
      {user ? (
        <>
          <Divider />
          <UserDetails>
            <PaddedCell
              icon={<UserIcon sx={iconStyles} />}
              text={user.name}
              tooltip={getLocalisedFullName(user.firstName, user.lastName)}
            />
          </UserDetails>
        </>
      ) : null}
      <Divider />
      <LanguageSelector>
        <PaddedCell
          icon={<TranslateIcon sx={iconStyles} />}
          text={currentLanguageName}
          tooltip={t('select-language', { ...store })}
        />
      </LanguageSelector>
      {isExtraSmallScreen && <Divider />}
      {isCentralServer ? (
        <PaddedCell
          icon={<CentralIcon />}
          text={t('label.central-server')}
          tooltip={t('select-language', { ...store })}
          sx={{ ml: isExtraSmallScreen ? 0 : 'auto' }}
        />
      ) : null}
      {isOpen && (
        <StoreEditModal
          nameId={store?.nameId ?? ''}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
    </Box>
  );
};
