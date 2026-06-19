import { Box } from '@openmsupply-client/common';
import React from 'react';

// Renders the raw log text in a single scrollable, monospace block. The browser
// handles the (potentially very large) text and its newlines natively — we
// deliberately do NOT render one element per line, which previously mounted
// hundreds of thousands of components for large logs and crashed the app.
export const LogTextDisplay = ({ logText }: { logText: string }) => (
  <Box
    component="pre"
    sx={{
      margin: 0,
      padding: 1,
      maxHeight: 500,
      overflow: 'auto',
      fontFamily: 'monospace',
      fontSize: '0.85rem',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      backgroundColor: 'background.menu',
      borderRadius: 1,
    }}
  >
    {logText}
  </Box>
);
