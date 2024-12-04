import React, { useState } from 'react';
import {
  Box,
  AlertIcon,
  Typography,
  useTranslation,
  ChevronDownIcon,
} from '@openmsupply-client/common';

export type LoginErrorProps = {
  error: string;
  details: string;
  hint?: string;
};

export const LoginError = ({ error, details, hint }: LoginErrorProps) => {
  const t = useTranslation();
  const [expand, setExpand] = useState(false);
  const hasMoreInformation = !!(details || hint);
  const chevronCommonStyles = {
    width: '0.6em',
    marginTop: '0.1em',
    height: '0.6em',
  };

  return (
    <Box
      display="flex"
      sx={{ backgroundColor: 'error.background', borderRadius: 2 }}
      gap={1}
      padding={1}
    >
      <Box display="flex" flexDirection="column">
        <Box display="flex" flexDirection="row">
          <Box color="error.main">
            <AlertIcon />
          </Box>
          <Box
            sx={{
              '& > div': { display: 'inline-block' },
              alignContent: 'center',
              paddingLeft: 1,
            }}
          >
            <Typography
              sx={{ color: 'inherit' }}
              variant="body2"
              component="span"
            >
              {error}
            </Typography>
          </Box>
        </Box>
        {hasMoreInformation && (
          <Box display="flex" flexDirection="column" sx={{ paddingLeft: 4 }}>
            <Typography
              variant="body2"
              alignItems="center"
              display="flex"
              sx={{
                cursor: 'pointer',
                fontSize: 12,
                color: 'secondary.main',
              }}
              onClick={() => setExpand(!expand)}
            >
              {t('error.more-info')}
              {expand ? (
                <ChevronDownIcon
                  sx={{
                    ...chevronCommonStyles,
                  }}
                />
              ) : (
                <ChevronDownIcon
                  sx={{
                    transform: 'rotate(-90deg)',
                    ...chevronCommonStyles,
                  }}
                />
              )}
            </Typography>
            {expand && (
              <Box>
                <Typography sx={{ textWrap: 'wrap' }} variant="body2">
                  {!!hint && hint}
                  {!!hint && !!details && <br />}
                  {!!details && details}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
