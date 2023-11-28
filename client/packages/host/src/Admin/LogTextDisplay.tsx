import { Typography } from '@common/components';
import React from 'react';

export const LogTextDisplay = ({ logText }: { logText: string[] | string }) => {
  if (Array.isArray(logText)) {
    return (
      <>
        {logText.map((logLine, i) => (
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
        ))}
      </>
    );
  } else {
    return (
      <Typography
        sx={{ overflow: 'scroll', whiteSpace: 'pre' }}
        component="div"
      >
        {`${logText}`}
      </Typography>
    );
  }
};
