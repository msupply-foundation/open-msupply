import React, { useState, useEffect, useCallback } from 'react';
import DialogActions from '@mui/material/DialogActions';
import DialogContent, { DialogContentProps } from '@mui/material/DialogContent';
import { TransitionProps } from '@mui/material/transitions';
import { Slide } from '../../ui/animations';
import { BasicModal, IconButton, ModalTitle } from '@common/components';
import { useIntlUtils, useTranslation } from '@common/intl';
import { SxProps, Theme } from '@mui/material';
import { CloseIcon } from '@common/icons';
import { useKeyboard } from '../useKeyboard';
import { EnvUtils, Platform } from '@common/utils';

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
  headerActions?: React.ReactNode;
  disableOkKeyBinding?: boolean;
  enableAutocomplete?: boolean;
  disableEnforceFocus?: boolean;
  testId?: string;
}

export interface DialogProps {
  onClose?: () => void;
  isOpen?: boolean;
  animationTimeout?: number;
  disableBackdrop?: boolean;
  disableEscapeKey?: boolean;
  disableMobileFullScreen?: boolean;
  isSidePanelModal?: boolean;
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
 * @property {boolean} [disableMobileFullScreen=false] (optional) disable modal entering fullscreen mode on smaller screens
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
    disableMobileFullScreen = false,
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

  const ModalComponent = ({
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
    headerActions,
    disableEnforceFocus = false,
    testId,
  }: ModalProps) => {
    const t = useTranslation();
    // The slide animation is triggered by cloning the next button and wrapping the passed
    // on click with a trigger to slide.
    const { slideConfig, onTriggerSlide } = useSlideAnimation(
      isRtl,
      animationTimeout
    );
    const { keyboardIsOpen, keyboardHeight } = useKeyboard();
    const isAndroid = EnvUtils.platform === Platform.Android;

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

    // The Android soft keyboard shrinks the fullscreen modal's viewport. The
    // rigid flex layout (#11891) has only the inner table scroll, so the focused
    // input gets trapped under the keyboard. While the keyboard is open, fall
    // back to a scrollable body so the input can scroll into view. Gated on
    // isAndroid && keyboardIsOpen (never true off-device), so desktop/web keep
    // the #11891 layout untouched.
    const scrollBodyForKeyboard = isAndroid && keyboardIsOpen;

    // Center the focused input in the scroll area so its row and neighbors stay
    // visible above the keyboard (native-app "scroll on focus" behavior).
    // scrollIntoView is unreliable in the Android WebView (smooth scroll gets
    // cancelled by the tap, wrong scroll ancestor picked), so we find the real
    // scroll container and set scrollTop ourselves.
    const centerFocusedInScroll = () => {
      // rAF: measure after layout/paint has settled.
      requestAnimationFrame(() => {
        const el = document.activeElement;
        if (!(el instanceof HTMLElement)) return;

        // Nearest vertically scrollable ancestor.
        let node = el.parentElement;
        let scroller: HTMLElement | null = null;
        while (node) {
          const { overflowY } = window.getComputedStyle(node);
          if (
            /(auto|scroll)/.test(overflowY) &&
            node.scrollHeight > node.clientHeight
          ) {
            scroller = node;
            break;
          }
          node = node.parentElement;
        }
        if (!scroller) return;

        const elRect = el.getBoundingClientRect();
        const scRect = scroller.getBoundingClientRect();
        const delta =
          elRect.top -
          scRect.top -
          (scroller.clientHeight / 2 - elRect.height / 2);
        scroller.scrollBy({ top: delta, behavior: 'smooth' });
      });
    };

    // Keyboard opening: the focus event fires before scrollBodyForKeyboard
    // flips, so this handles the first focus (delay = keyboard animation).
    React.useEffect(() => {
      if (!scrollBodyForKeyboard) return;
      const id = setTimeout(centerFocusedInScroll, 150);
      return () => clearTimeout(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollBodyForKeyboard, keyboardHeight]);

    // Moving between rows with the keyboard already open: no resize fires, so
    // re-center on each focus.
    const handleFormFocus = () => {
      if (scrollBodyForKeyboard) centerFocusedInScroll();
    };

    // Children wrapper. Default: fill the modal so the inner table scrolls
    // internally (#11891). Keyboard open: plain block that flows to its natural
    // height, padded by the keyboard height so the last rows can scroll clear.
    const keyboardScrollWrapperStyle: React.CSSProperties = scrollBodyForKeyboard
      ? { display: 'block', paddingBottom: keyboardHeight }
      : { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' };
    const dimensions = {
      height: height ? Math.min(window.innerHeight - 50, height) : undefined,
      width: width ? Math.min(window.innerWidth - 50, width) : undefined,
    };

    const defaultFullscreen = isAndroid && !disableMobileFullScreen;

    return (
      <BasicModal
        open={open}
        onClose={handleClose}
        width={dimensions.width}
        height={dimensions.height}
        sx={sx}
        TransitionComponent={Transition}
        disableEscapeKeyDown={false}
        fullScreen={defaultFullscreen}
        disableEnforceFocus={disableEnforceFocus}
        {...(testId ? { 'data-testid': testId } : {})}
      >
        {defaultFullscreen && (
          <IconButton
            icon={<CloseIcon />}
            color="primary"
            onClick={() => {
              onClose && onClose();
              hideDialog();
            }}
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              padding: 2,
              zIndex: 1,
            }}
            label={t('button.close')}
          />
        )}
        {title ? (
          <ModalTitle title={title} headerActions={headerActions} />
        ) : null}
        <form
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            overflow: scrollBodyForKeyboard ? 'auto' : 'hidden',
            width: defaultFullscreen ? '100%' : dimensions.width,
            margin: '0 auto',
          }}
          onFocus={handleFormFocus}
          {...formProps}
        >
          <DialogContent
            {...restOfContentProps}
            sx={{
              overflowX: 'hidden',
              ...contentSX,
              // Override the per-modal overflowY:hidden / display:flex lock so
              // the body can scroll the focused input above the keyboard.
              ...(scrollBodyForKeyboard
                ? { overflowY: 'auto', display: 'block' }
                : {}),
            }}
          >
            {slideAnimation ? (
              <Slide in={slideConfig.in} direction={slideConfig.direction}>
                <div style={keyboardScrollWrapperStyle}>
                  {slideConfig.in && children}
                </div>
              </Slide>
            ) : (
              <div style={keyboardScrollWrapperStyle}>{children}</div>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              justifyContent: 'center',
              marginBottom: keyboardIsOpen ? 0 : '30px',
              marginTop: keyboardIsOpen ? 0 : '30px',
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
