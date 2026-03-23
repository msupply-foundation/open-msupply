import React, { ReactNode, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Slide,
  styled,
  ClickAwayListener,
} from '@mui/material';
import { FocusTrap } from '@mui/base';

const Backdrop = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  zIndex: 1398,
});

export interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  okButton?: ReactNode;
  cancelButton?: ReactNode;
  width?: string | number;
  preventClickAway?: boolean;
}

export const SlidePanel = ({
  open,
  onClose,
  title,
  children,
  okButton,
  cancelButton,
  width = '100%',
  preventClickAway = true,
}: SlidePanelProps) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  const panel = (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width,
        zIndex: 1399,
      }}
    >
      <Slide direction="right" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={4}
          onKeyDown={handleKeyDown}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width,
            zIndex: 1399,
          }}
        >
          <FocusTrap open={open}>
            <Box style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {title && (
                <Typography
                  sx={theme => ({
                    padding: 2,
                    color: theme.typography.body1.color,
                    fontSize: theme.typography.body1.fontSize,
                    fontWeight: 'bold',
                  })}
                >
                  {title}
                </Typography>
              )}
              <Box overflow="auto" flex={1}>
                {children}
              </Box>
              {(okButton || cancelButton) && (
                <Box
                  display="flex"
                  justifyContent="center"
                  pb={5}
                  gap={1}
                  pt={1.5}
                >
                  {cancelButton}
                  {okButton}
                </Box>
              )}
            </Box>
          </FocusTrap>
        </Paper>
      </Slide>
    </Box>
  );

  const content = (
    <>
      {<Backdrop onClick={preventClickAway ? undefined : onClose} />}
      {panel}
    </>
  );

  return preventClickAway ? (
    open && content
  ) : (
    <ClickAwayListener onClickAway={onClose}>{content}</ClickAwayListener>
  );
};
