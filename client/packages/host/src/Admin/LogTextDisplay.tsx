import { Tooltip, Typography } from '@common/components';
import React from 'react';

export const LogTextDisplay = ({ logText }: { logText: string[] | string }) => {
  if (Array.isArray(logText)) {
    return (
      <>
        {logText.map((logLine, i) => (
          <Tooltip key={i} title={logLine}>
            <Typography
              sx={{
                overflow: 'ellipsis',
                textOverflow: 'ellipsis',
                whiteSpace: 'pre',
                maxWidth: '100%',
              }}
              noWrap
              component="div"
              key={i}
            >
              {`${logLine}`}
            </Typography>
          </Tooltip>
        ))}
      </>
    );
  } else {
    return (
      <Tooltip title={logText}>
        <Typography
          sx={{ overflow: 'scroll', whiteSpace: 'pre' }}
          component="div"
        >
          {`${logText}`}
        </Typography>
      </Tooltip>
    );
  }
};
