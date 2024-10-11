import React, { useState } from 'react';
import {
  AppBarContentPortal,
  Grid,
  BookIcon,
  Typography,
  useTranslation,
  ChevronDownIcon,
  LocaleKey,
} from '@openmsupply-client/common';

interface ToolbarProps {
  reportName: string;
}

export const Toolbar = ({ reportName }: ToolbarProps) => {
  const t = useTranslation();
  const [expand, setExpand] = useState(false);
  const chevronCommonStyles = {
    width: '0.6em',
    marginTop: '0.1em',
    height: '0.6em',
  };
  const reportFormat = reportName.toLowerCase().replace(' ', '-');

  return (
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
            {t('messages.how-to-read-report', { reportName })}
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
              {t(`messages.how-to-read-${reportFormat}` as LocaleKey)}
            </Typography>
          </Grid>
        )}
      </Grid>
    </AppBarContentPortal>
  );
};
