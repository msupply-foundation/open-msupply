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
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width,
        height: '100%',
        overflow: 'hidden',
        zIndex: 1399,
      }}
    >
      <Slide direction="left" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={4}
          sx={{
            display: 'flex',
            flexDirection: 'column',
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
          <Box flex={1}>{children}</Box>
          {(okButton || cancelButton) && (
            <Box display="flex" justifyContent="center" pb={5} gap={1}>
              {cancelButton}
              {okButton}
            </Box>
          )}
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
