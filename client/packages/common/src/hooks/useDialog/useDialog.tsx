import React, { useState, useEffect } from 'react';
import DialogActions from '@mui/material/DialogActions';
import DialogContent, { DialogContentProps } from '@mui/material/DialogContent';
import { Slide } from '../../ui/animations';
import { BasicModal, ModalTitle } from '@common/components';
import { IntlUtils } from '@common/intl';

export interface ButtonProps {
  icon?: React.ReactElement;
  label?: string;
  onClick?: () => void;
  visible?: boolean;
}

export interface ModalProps {
  contentProps?: DialogContentProps;
  children: React.ReactElement<any, any>;
  cancelButton?: JSX.Element;
  height?: number;
  nextButton?: React.ReactElement<{
    onClick: () => Promise<boolean>;
  }>;
  slideAnimation?: boolean;

  okButton?: JSX.Element;
  width?: number;
  title: string;
}
export interface DialogProps {
  onClose?: () => void;
  isOpen?: boolean;
}

interface DialogState {
  Modal: React.FC<ModalProps>;
  hideDialog: () => void;
  open: boolean;
  showDialog: () => void;
}

enum Direction {
  Left = 'left',
  Right = 'right',
  Up = 'up',
  Down = 'down',
}

const useSlideAnimation = (isRtl: boolean) => {
  const [slideConfig, setSlide] = useState({
    in: true,
    direction: isRtl ? Direction.Left : Direction.Right,
  });

  const onTriggerSlide = () => {
    setSlide({
      in: false,
      direction: isRtl ? Direction.Right : Direction.Left,
    });
    setTimeout(() => {
      setSlide({
        in: true,
        direction: isRtl ? Direction.Left : Direction.Right,
      });
    }, 500);
  };

  return { slideConfig, onTriggerSlide };
};

export const useDialog = (dialogProps?: DialogProps): DialogState => {
  const { onClose, isOpen } = dialogProps ?? {};
  const [open, setOpen] = React.useState(false);
  const showDialog = () => setOpen(true);
  const hideDialog = () => setOpen(false);
  const isRtl = IntlUtils.useRtl();

  useEffect(() => {
    if (isOpen != null) setOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    onClose && onClose();
    hideDialog();
  };

  const ModalComponent: React.FC<ModalProps> = ({
    cancelButton,
    children,
    height,
    nextButton,
    okButton,
    width,
    title,
    contentProps,
    slideAnimation = true,
  }) => {
    // The slide animation is triggered by cloning the next button and wrapping the passed
    // on click with a trigger to slide.
    const { slideConfig, onTriggerSlide } = useSlideAnimation(isRtl);

    let WrappedNextButton: ModalProps['nextButton'] = undefined;
    if (nextButton) {
      const { onClick, ...restOfNextButtonProps } = nextButton.props;

      // TODO: If you want to change the slide direction or other animation details, add a prop
      // slideAnimationConfig and add a parameter to `useSlideAnimation` to pass in the config.
      WrappedNextButton = React.cloneElement(nextButton, {
        onClick: slideAnimation
          ? async () => {
              const result = await onClick();
              if (!!result) onTriggerSlide();
              return result;
            }
          : onClick,
        ...restOfNextButtonProps,
      });
    }

    const { sx: contentSX, ...restOfContentProps } = contentProps ?? {};
    return (
      <BasicModal
        open={open}
        onClose={handleClose}
        width={width}
        height={height}
      >
        {title ? <ModalTitle title={title} /> : null}
        <DialogContent
          {...restOfContentProps}
          sx={{ overflowX: 'hidden', ...contentSX }}
        >
          {slideAnimation ? (
            <Slide in={slideConfig.in} direction={slideConfig.direction}>
              <div>{slideConfig.in && children}</div>
            </Slide>
          ) : (
            <div>{children}</div>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: 'center',
            marginBottom: '30px',
            marginTop: '30px',
          }}
        >
          {cancelButton}
          {okButton}
          {WrappedNextButton}
        </DialogActions>
      </BasicModal>
    );
  };

  const Modal = React.useMemo(() => ModalComponent, [open]);

  return { hideDialog, Modal, open, showDialog };
};
