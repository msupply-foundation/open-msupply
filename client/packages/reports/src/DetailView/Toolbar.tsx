import React, { useState } from 'react';
import {
  AppBarContentPortal,
  Grid,
  BookIcon,
  Typography,
  useTranslation,
  ChevronDownIcon,
  LocaleKey,
  useTranslationAdvanced,
} from '@openmsupply-client/common';

interface ToolbarProps {
  reportCode: string;
}

export const Toolbar = ({ reportCode }: ToolbarProps) => {
  const t = useTranslation();
  const [expand, setExpand] = useState(false);
  const chevronCommonStyles = {
    width: '0.6em',
    marginTop: '0.1em',
    height: '0.6em',
  };

  const key = `messages.how-to-read-${reportCode}` as LocaleKey;

  const { i18n } = useTranslationAdvanced();
  const exists = i18n.exists(key);

  return (
    exists && (
      <AppBarContentPortal
        sx={{
          display: 'flex',
          flex: 1,
          marginBottom: 1,
          flexDirection: 'column',
        }}
      >
        <Grid width={800}>
          <Grid display="flex" flexDirection="row">
            <BookIcon
              color="primary"
              sx={{ width: '1em', marginTop: '0.1em', height: '0.7em' }}
            />
            <Typography
              variant="body2"
              alignItems="center"
              display="flex"
              sx={{
                cursor: 'pointer',
                color: 'secondary.main',
              }}
              onClick={() => setExpand(!expand)}
            >
              {t('messages.how-to-read-report')}
              {expand ? (
                <ChevronDownIcon sx={{ ...chevronCommonStyles }} />
              ) : (
                <ChevronDownIcon
                  sx={{ transform: 'rotate(-90deg)', ...chevronCommonStyles }}
                />
              )}
            </Typography>
          </Grid>
          {expand && (
            <Grid sx={{ paddingLeft: 3 }}>
              <Typography
                sx={{ textWrap: 'wrap', whiteSpace: 'pre-line' }}
                variant="body2"
              >
                {t(key)}
              </Typography>
            </Grid>
          )}
        </Grid>
      </AppBarContentPortal>
    )
  );
};
