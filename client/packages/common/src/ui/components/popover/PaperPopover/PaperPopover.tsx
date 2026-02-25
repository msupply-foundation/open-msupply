import React, {
  FC,
  PropsWithChildren,
  useImperativeHandle,
  useRef,
} from 'react';
import { Box, PaperProps, Popover, PopoverOrigin } from '@mui/material';

export const usePaperPopover = () => {
  const actions = useRef<PopoverActions>({
    show: () => {},
    hide: () => {},
  });

  const PaperPopoverInternal: FC<PropsWithChildren<PopoverProps>> = props => (
    <PaperPopover {...props} actions={actions} />
  );

  return {
    PaperPopover: PaperPopoverInternal,
    show: actions.current.show,
    hide: actions.current.hide,
  };
};

export interface PopoverActions {
  show: (event: React.MouseEvent<HTMLElement>) => void;
  hide: () => void;
}

export interface PopoverProps {
  mode: 'hover' | 'click';
  Content: React.ReactElement;
  placement?: PopoverOrigin;
  paperProps?: PaperProps;
  width?: number;
  height?: number;
  actions?: React.MutableRefObject<PopoverActions>;
}

export const PaperPopover: React.FC<PropsWithChildren<PopoverProps>> = ({
  children,
  mode,
  Content,
  placement = { vertical: 'top', horizontal: 'center' },
  paperProps,
  width,
  height,
  actions,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  // Could be made to show the popup at the mouse position instead of the element if needed:
  // const getBoundingClientRect = () =>
  //   ({
  //     top: e.clientY,
  //     left: e.clientX,
  //     bottom: e.clientY,
  //     right: e.clientX,
  //     width: 25,
  //     height: 25,
  //   }) as DOMRect;
  const handlePopoverShow = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverHide = () => {
    setAnchorEl(null);
  };

  useImperativeHandle(actions, () => ({
    show: handlePopoverShow,
    hide: handlePopoverHide,
  }));

  const open = Boolean(anchorEl);

  return (
    <>
      <Box
        aria-owns={open ? 'mouse-over-popover' : undefined}
        aria-haspopup="true"
        style={{ cursor: mode === 'hover' ? 'help' : 'pointer' }}
        {...(mode === 'hover'
          ? {
              onMouseEnter: handlePopoverShow,
              onMouseLeave: handlePopoverHide,
            }
          : {})}
        onClick={handlePopoverShow}
      >
        {children}
      </Box>
      <Popover
        id="mouse-over-popover"
        // mouse shouldn't be able to interact with the popover when in hover mode, otherwise it would flicker when trying to move the mouse from the target element to the popover
        sx={{ ...(mode === 'hover' ? { pointerEvents: 'none' } : {}) }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={getAnchorOrigin(placement)}
        transformOrigin={getTransformOrigin(placement)}
        onClose={handlePopoverHide}
        disableRestoreFocus
        slotProps={{
          paper: {
            style: {
              height: height ? `${height}px` : 'auto',
              width: width ? `${width}px` : 'auto',
              borderRadius: '16px',
              transform: getTranslation(placement),
              ...paperProps?.style,
            },
          },
        }}
      >
        {Content}
      </Popover>
    </>
  );
};

// Could just expose the anchorOrigin and transformOrigin as props, but this way we can keep the API simpler but have less options
const getAnchorOrigin = (placement: PopoverOrigin): PopoverOrigin => ({
  vertical: placement.vertical,
  horizontal:
    placement.horizontal === 'left'
      ? 'right'
      : placement.horizontal === 'right'
        ? 'left'
        : 'center',
});
const getTransformOrigin = (placement: PopoverOrigin): PopoverOrigin => ({
  vertical:
    placement.vertical === 'top'
      ? 'bottom'
      : placement.vertical === 'bottom'
        ? 'top'
        : 'center',
  horizontal:
    placement.horizontal === 'left'
      ? 'right'
      : placement.horizontal === 'right'
        ? 'left'
        : 'center',
});
const getTranslation = (placement: PopoverOrigin) => {
  const y =
    placement.vertical === 'top'
      ? '-8px'
      : placement.vertical === 'bottom'
        ? '8px'
        : '0';
  return `translateY(${y})`;
};
