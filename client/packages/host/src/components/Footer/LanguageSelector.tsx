import React, { FC } from 'react';
import {
  Box,
  FlatButton,
  PaperPopoverSection,
  usePaperClickPopover,
  useTranslation,
  IntlUtils,
  useNavigate,
} from '@openmsupply-client/common';

import { PropsWithChildrenOnly } from '@common/types';

export const LanguageSelector: FC<PropsWithChildrenOnly> = ({ children }) => {
  const navigate = useNavigate();
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const t = useTranslation('app');

  const i18n = IntlUtils.useI18N();

  const languageButtons = IntlUtils.languageOptions.map(l => (
    <FlatButton
      label={l.label}
      disabled={l.value === i18n.language}
      onClick={() => {
        i18n.changeLanguage(l.value);
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
