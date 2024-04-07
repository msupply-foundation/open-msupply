import { Tooltip, Typography } from '@openmsupply-client/common';
import React from 'react';

export const LogTextDisplay = ({ logText }: { logText: string[] | string }) => {
  return Array.isArray(logText) ? (
    <>
      {logText.map((logLine, i) => (
        <Tooltip key={i} title={logLine}>
          <Typography
            sx={{
              whiteSpace: 'pre',
              maxWidth: '100%',
            }}
            noWrap
            component="div"
            key={i}
          >
            {logLine}
          </Typography>
        </Tooltip>
      ))}
    </>
  ) : (
    <Tooltip title={logText}>
      <Typography
        sx={{ overflow: 'scroll', whiteSpace: 'pre' }}
        component="div"
      >
        {logText}
      </Typography>
    </Tooltip>
  );
};
