import React, { useState, useEffect, useCallback } from 'react';
import DialogActions from '@mui/material/DialogActions';
import DialogContent, { DialogContentProps } from '@mui/material/DialogContent';
import { TransitionProps } from '@mui/material/transitions';
import { Slide } from '../../ui/animations';
import { BasicModal, ModalTitle } from '@common/components';
import { useIntlUtils } from '@common/intl';
import { SxProps, Theme } from '@mui/material';

type OkClickEvent = React.MouseEvent<HTMLButtonElement, MouseEvent>;

export interface ButtonProps {
  icon?: React.ReactElement;
  label?: string;
  onClick?: () => void;
  visible?: boolean;
}

export interface ModalProps {
  contentProps?: DialogContentProps;
  children: React.ReactElement;
  cancelButton?: JSX.Element;
  height?: number;
  nextButton?: React.ReactElement<{
    onClick: (e?: OkClickEvent) => Promise<boolean>;
    disabled?: boolean;
    type?: 'submit' | 'button' | 'reset';
  }>;
  slideAnimation?: boolean;
  Transition?: React.ForwardRefExoticComponent<
    TransitionProps & {
      children: React.ReactElement;
    } & React.RefAttributes<unknown>
  >;
  okButton?: React.ReactElement<{
    onClick: (e?: OkClickEvent) => Promise<boolean>;
    type?: 'submit' | 'button' | 'reset';
  }>;
  reportSelector?: React.ReactElement;
  copyButton?: JSX.Element;
  saveButton?: JSX.Element;
  width?: number;
  sx?: SxProps<Theme>;
  title: string;
  deleteButton?: JSX.Element;
  disableOkKeyBinding?: boolean;
  enableAutocomplete?: boolean;
}

export interface DialogProps {
  onClose?: () => void;
  isOpen?: boolean;
  animationTimeout?: number;
  disableBackdrop?: boolean;
  disableEscapeKey?: boolean;
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

const useSlideAnimation = (isRtl: boolean, timeout: number) => {
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
    }, timeout);
  };

  return { slideConfig, onTriggerSlide };
};

/**
 * Hook to return a dialog component
 *
 * @param {DialogProps} dialogProps the dialog props. Properties are:
 * @property {number} [animationTimeout=500] the timeout for the slide animation
 * @property {boolean} [disableBackdrop=false] (optional) disable clicking the backdrop to close the modal
 * @property {boolean} [disableEscape=false] (optional) disable pressing of the escape key to close the modal
 * @property {boolean} isOpen (optional) is the modal open
 * @property {function} onClose (optional) method to run on closing the modal
 * @return {DialogState} the dialog state. Properties are:
 * @property {function} hideDialog method to hide the dialog
 * @property {ReactNode} Modal the modal component
 * @property {boolean} open indicates if the modal is shown
 * @property {function} showDialog method to show the dialog
 */
export const useDialog = (dialogProps?: DialogProps): DialogState => {
  const {
    onClose,
    isOpen,
    animationTimeout = 500,
    disableBackdrop = true,
    disableEscapeKey = false,
  } = dialogProps ?? {};
  const [open, setOpen] = React.useState(false);
  const showDialog = useCallback(() => setOpen(true), []);
  const hideDialog = useCallback(() => setOpen(false), []);
  const { isRtl } = useIntlUtils();

  useEffect(() => {
    if (isOpen != null) setOpen(isOpen);
  }, [isOpen]);

  const handleClose = (_: Event, reason: 'escapeKeyDown' | 'backdropClick') => {
    const canClose =
      (!disableBackdrop && reason === 'backdropClick') ||
      (!disableEscapeKey && reason === 'escapeKeyDown');

    if (canClose) {
      onClose && onClose();
      hideDialog();
      return;
    }
    setOpen(true);
  };

  const ModalComponent: React.FC<ModalProps> = ({
    cancelButton,
    children,
    height,
    nextButton,
    okButton,
    reportSelector,
    copyButton,
    saveButton,
    width,
    title,
    contentProps,
    slideAnimation = true,
    Transition,
    disableOkKeyBinding,
    enableAutocomplete,
    sx = {},
    deleteButton,
  }) => {
    // The slide animation is triggered by cloning the next button and wrapping the passed
    // on click with a trigger to slide.
    const { slideConfig, onTriggerSlide } = useSlideAnimation(
      isRtl,
      animationTimeout
    );

    const defaultPreventedOnClick =
      (onClick: (e?: OkClickEvent) => Promise<boolean>) =>
      (e?: OkClickEvent) => {
        e && e.preventDefault();
        return onClick(e);
      };

    let WrappedNextButton: ModalProps['nextButton'] = undefined;
    let WrappedOkButton: ModalProps['okButton'] = undefined;

    if (nextButton) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onClick, type, ...restOfNextButtonProps } = nextButton.props;

      const handler = defaultPreventedOnClick(onClick);

      // TODO: If you want to change the slide direction or other animation details, add a prop
      // slideAnimationConfig and add a parameter to `useSlideAnimation` to pass in the config.
      WrappedNextButton = React.cloneElement(nextButton, {
        onClick: slideAnimation
          ? async (e?: OkClickEvent) => {
              const result = await handler(e);
              if (!!result) onTriggerSlide();
              return result;
            }
          : handler,
        type: !disableOkKeyBinding ? 'submit' : 'button',
        ...restOfNextButtonProps,
      });
    }

    if (okButton) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onClick, type, ...restOfOkButtonProps } = okButton.props;

      WrappedOkButton = React.cloneElement(okButton, {
        onClick: defaultPreventedOnClick(onClick),
        // If the next button is not present/disabled, the ok button should be a submit button (allow firing on enter key press)
        type:
          !disableOkKeyBinding && (!nextButton || nextButton.props.disabled)
            ? 'submit'
            : 'button',
        ...restOfOkButtonProps,
      });
    }

    const formProps = enableAutocomplete ? { autoComplete: 'on' } : {};
    const { sx: contentSX, ...restOfContentProps } = contentProps ?? {};
    const dimensions = {
      height: height ? Math.min(window.innerHeight - 50, height) : undefined,
      width: width ? Math.min(window.innerWidth - 50, width) : undefined,
    };

    return (
      <BasicModal
        open={open}
        onClose={handleClose}
        width={dimensions.width}
        height={dimensions.height}
        sx={sx}
        TransitionComponent={Transition}
        disableEscapeKeyDown={false}
      >
        {title ? <ModalTitle title={title} /> : null}
        <form
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}
          {...formProps}
        >
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
            {deleteButton}
            {saveButton}
            {copyButton}
            {WrappedOkButton}
            {WrappedNextButton}
            {reportSelector}
          </DialogActions>
        </form>
      </BasicModal>
    );
  };

  const Modal = React.useMemo(() => ModalComponent, [open]);

  return { hideDialog, Modal, open, showDialog };
};
