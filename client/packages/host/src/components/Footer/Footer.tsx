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
  useTheme,
  useIsSmallScreen,
  SxProps,
} from '@openmsupply-client/common';
import { StoreSelector } from './StoreSelector';
import { LanguageSelector } from './LanguageSelector';
import { FacilityEditModal, useName } from '@openmsupply-client/system';
import { UserDetails } from './UserDetails';

interface PaddedCellProps {
  sx?: SxProps;
  text?: string;
  icon: ReactNode;
  textSx?: SxProps;
  tooltip?: string;
  onClick?: () => void;
}

const PaddedCell: FC<PaddedCellProps> = ({
  sx,
  text,
  icon,
  textSx,
  tooltip,
  onClick,
}) => {
  const isSmallScreen = useIsSmallScreen();
  return (
    <Box
      display="flex"
      alignItems="center"
      onClick={onClick}
      sx={{ cursor: onClick ? 'pointer' : 'inherit', ...sx }}
    >
      {icon}
      {!isSmallScreen && text && (
        <Tooltip title={tooltip || ''}>
          <Typography
            sx={{
              color: 'inherit',
              fontSize: '12px',
              marginInlineStart: '8px',
              ...textSx,
            }}
          >
            {text}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
};

export const Footer: FC = () => {
  const theme = useTheme();
  const t = useTranslation();
  const isSmallScreen = useIsSmallScreen();
  const { user, store } = useAuthContext();
  const { currentLanguageName, getLocalisedFullName } = useIntlUtils();

  const isCentralServer = useIsCentralServerApi();
  const { isOpen, onClose, onOpen } = useEditModal();
  const { data: nameProperties } = useName.document.properties();

  const Divider = styled(Box)({
    width: '1px',
    height: '24px',
    backgroundColor: isCentralServer ? '#fff' : theme.palette.gray.main,
  });

  const iconStyles = {
    color: 'inherit',
    height: isSmallScreen ? 24 : 16,
    width: isSmallScreen ? 24 : 16,
  };

  return (
    <Box
      gap={2}
      flex={1}
      display="flex"
      alignItems="center"
      px={0}
      py={isSmallScreen ? 1.5 : 0.75}
      justifyContent={isSmallScreen ? 'space-evenly' : 'inherit'}
    >
      {isOpen && (
        <FacilityEditModal
          nameId={store?.nameId ?? ''}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
      <StoreSelector>
        <PaddedCell
          icon={<HomeIcon sx={iconStyles} />}
          text={store?.name}
          tooltip={t('store-details', { ...store })}
        />
      </StoreSelector>
      {!!nameProperties?.length && (
        <PaddedCell
          icon={<EditIcon sx={iconStyles} />}
          text={t('label.edit')}
          tooltip={t('label.edit-store-properties')}
          onClick={onOpen}
        />
      )}
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
      {isSmallScreen && <Divider />}
      {isCentralServer ? (
        <PaddedCell
          icon={<CentralIcon />}
          text={t('label.central-server')}
          tooltip={t('select-language', { ...store })}
          sx={{ ml: isSmallScreen ? 0 : 'auto' }}
          textSx={{ marginInlineStart: 0 }}
        />
      ) : null}
    </Box>
  );
};
