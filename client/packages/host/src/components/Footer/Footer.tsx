import React from 'react';
import {
  Box,
  HomeIcon,
  IntlUtils,
  styled,
  Tooltip,
  TranslateIcon,
  Typography,
  useAuthContext,
  UserIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { StoreSelector } from './StoreSelector';
import { LanguageSelector } from './LanguageSelector';

export const Footer: React.FC = () => {
  const { user, store } = useAuthContext();
  const t = useTranslation('app');
  const i18n = IntlUtils.useI18N();
  const PaddedCell = styled(Box)({ display: 'flex' });
  const iconStyles = { color: 'gray.main', height: '16px', width: '16px' };
  const textStyles = {
    color: 'gray.main',
    fontSize: '12px',
    marginInlineStart: '8px',
  };

  return (
    <Box gap={2} display="flex" flex={1} alignItems="center">
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
            <Typography sx={textStyles}>
              {IntlUtils.getLanguageName(i18n.language)}
            </Typography>
          </Tooltip>
        </PaddedCell>
      </LanguageSelector>
    </Box>
  );
};
