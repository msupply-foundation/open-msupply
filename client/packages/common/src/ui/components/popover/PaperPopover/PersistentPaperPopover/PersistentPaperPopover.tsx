import React, { PropsWithChildren } from 'react';
import Paper from '@mui/material/Paper';
import { PaperPopoverProps, usePopover } from '../..';
import { CloseIcon } from '@common/icons';
import { Box, ClickAwayListener, IconButton } from '@mui/material';

export function PersistentPaperPopover({
  children,
  Content,
  popoverControls,
  paperProps,
  width,
  height,
  placement = 'left',
}: PropsWithChildren<PaperPopoverProps> & {
  popoverControls: ReturnType<typeof usePopover>;
}) {
  const { show, hide, Popover } = popoverControls;
  return (
    <>
      <div
        style={{
          cursor: 'pointer',
          // prevents the blue highlight on click on mobile browser
          WebkitTapHighlightColor: 'transparent',
        }}
        onClick={show}
      >
        {children}
      </div>
      <Popover placement={placement}>
        <Box>
          <IconButton
            color="primary"
            onClick={hide}
            size="small"
            style={{ position: 'absolute', right: 4, top: 4 }}
          >
            <CloseIcon />
          </IconButton>
          <ClickAwayListener onClickAway={hide}>
            <Paper
              sx={{
                height: height ? `${height}px` : 'auto',
                width: width ? `${width}px` : 'auto',
                borderRadius: '16px',
                boxShadow: theme => theme.shadows[7],
                ...paperProps?.sx,
              }}
              {...paperProps}
            >
              {Content}
            </Paper>
          </ClickAwayListener>
        </Box>
      </Popover>
    </>
  );
}
