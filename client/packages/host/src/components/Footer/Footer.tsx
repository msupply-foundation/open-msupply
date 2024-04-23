import React from 'react';
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
} from '@openmsupply-client/common';
import { StoreSelector } from './StoreSelector';
import { LanguageSelector } from './LanguageSelector';

export const Footer: React.FC = () => {
  const { user, store } = useAuthContext();
  const t = useTranslation('app');
  const { currentLanguageName } = useIntlUtils();
  const isCentralServer = useIsCentralServerApi();
  const PaddedCell = styled(Box)({ display: 'flex' });
  const iconStyles = { color: 'inherit', height: '16px', width: '16px' };
  const textStyles = {
    color: 'inherit',
    fontSize: '12px',
    marginInlineStart: '8px',
  };

  return (
    <Box
      gap={2}
      display="flex"
      flex={1}
      alignItems="center"
      paddingY={0.75}
      paddingX={0}
    >
      <StoreSelector>
        <PaddedCell>
          <HomeIcon sx={iconStyles} />
          <Tooltip title={t('store-details', { ...store })}>
            <Typography sx={textStyles}>{store?.name}</Typography>
          </Tooltip>
        </PaddedCell>
      </StoreSelector>
      {user ? (
        <PaddedCell>
          <UserIcon sx={iconStyles} />
          <Typography sx={textStyles}>{user.name}</Typography>
        </PaddedCell>
      ) : null}
      <LanguageSelector>
        <PaddedCell>
          <TranslateIcon sx={iconStyles} />
          <Tooltip title={t('select-language', { ...store })}>
            <Typography sx={textStyles}>{currentLanguageName}</Typography>
          </Tooltip>
        </PaddedCell>
      </LanguageSelector>
      {isCentralServer ? (
        <Box
          flex={1}
          justifyContent="flex-end"
          display="flex"
          alignItems="center"
          paddingX={2}
        >
          <CentralIcon />
          <Typography
            variant="caption"
            sx={{ color: 'inherit', whiteSpace: 'nowrap' }}
          >
            {t('label.central-server')}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};
