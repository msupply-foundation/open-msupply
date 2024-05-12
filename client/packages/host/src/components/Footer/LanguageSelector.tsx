import React, { FC } from 'react';
import {
  Box,
  FlatButton,
  PaperPopoverSection,
  usePaperClickPopover,
  useTranslation,
  useNavigate,
} from '@openmsupply-client/common';
import { useIntlUtils, SupportedLocales, useUserName } from '@common/intl';

import { PropsWithChildrenOnly } from '@common/types';

export const LanguageSelector: FC<PropsWithChildrenOnly> = ({ children }) => {
  const navigate = useNavigate();
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const t = useTranslation('app');
  const username = useUserName();

  const { changeLanguage, currentLanguage, languageOptions, setUserLocale } =
    useIntlUtils();

  const languageButtons = languageOptions.map(l => (
    <FlatButton
      label={l.label}
      name={l.value}
      disabled={l.value === currentLanguage}
      onClick={() => {
        changeLanguage(l.value);
        setUserLocale(username, l.value as SupportedLocales);
        hide();
        navigate(0);
      }}
      key={l.value}
      sx={{
        whiteSpace: 'nowrap',
        overflowX: 'hidden',
        overflowY: 'visible',
        textOverflow: 'ellipsis',
        display: 'block',
        textAlign: 'left',
      }}
    />
  ));
  return (
    <PaperClickPopover
      className="language-selector"
      placement="top"
      width={300}
      Content={
        <PaperPopoverSection label={t('select-language')}>
          <Box
            style={{
              overflowY: 'auto',
              maxHeight: 300,
            }}
          >
            {languageButtons}
          </Box>
        </PaperPopoverSection>
      }
    >
      {children}
    </PaperClickPopover>
  );
};
