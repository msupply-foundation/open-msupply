import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Paper,
  Slide,
  styled,
  ClickAwayListener,
} from '@mui/material';

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
  width = 400,
  preventClickAway = true,
}: SlidePanelProps) => {
  const panel = (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={4}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          right: 0,
          top: 0,
          height: '100%',
          width,
          zIndex: 1399,
        }}
      >
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
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
        {(okButton || cancelButton) && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              pb: 5,
              gap: 1,
            }}
          >
            {cancelButton}
            {okButton}
          </Box>
        )}
      </Paper>
    </Slide>
  );

  const content = (
    <>
      {open && <Backdrop onClick={preventClickAway ? undefined : onClose} />}
      {panel}
    </>
  );

  return preventClickAway ? (
    content
  ) : (
    <ClickAwayListener onClickAway={onClose}>{content}</ClickAwayListener>
  );
};
