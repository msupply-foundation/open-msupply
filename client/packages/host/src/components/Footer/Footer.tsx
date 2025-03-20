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
  useIsExtraSmallScreen,
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
  const isExtraSmallScreen = useIsExtraSmallScreen();
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

export const Footer: FC = () => {
  const theme = useTheme();
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();
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
    height: isExtraSmallScreen ? 24 : 16,
    width: isExtraSmallScreen ? 24 : 16,
  };

  return (
    <Box
      gap={2}
      flex={1}
      display="flex"
      alignItems="center"
      px={0}
      py={isExtraSmallScreen ? 1.5 : 0.75}
      justifyContent={isExtraSmallScreen ? 'space-evenly' : 'inherit'}
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
      {isExtraSmallScreen && <Divider />}
      {isCentralServer ? (
        <PaddedCell
          icon={<CentralIcon />}
          text={t('label.central-server')}
          tooltip={t('select-language', { ...store })}
          sx={{ ml: isExtraSmallScreen ? 0 : 'auto' }}
        />
      ) : null}
    </Box>
  );
};
