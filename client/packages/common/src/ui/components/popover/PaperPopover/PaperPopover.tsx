import React, { PropsWithChildren } from 'react';
import { Box, PaperProps, Popover, PopoverOrigin } from '@mui/material';

export interface PopoverProps {
  mode: 'hover' | 'click';
  Content: React.ReactElement;
  placement?: PopoverOrigin;
  paperProps?: PaperProps;
  width?: number;
  height?: number;
  anchorEl?: HTMLElement | null;
  onAnchorElChange?: (anchorEl: HTMLElement | null) => void;
}

export const PaperPopover: React.FC<PropsWithChildren<PopoverProps>> = ({
  children,
  mode,
  Content,
  placement = { vertical: 'top', horizontal: 'center' },
  paperProps,
  width,
  height,
  anchorEl: anchorElProp,
  onAnchorElChange,
}) => {
  const [internalAnchorEl, setInternalAnchorEl] =
    React.useState<HTMLElement | null>(null);

  const isControlled = anchorElProp !== undefined;
  const anchorEl = isControlled ? anchorElProp : internalAnchorEl;
  const open = Boolean(anchorEl);

  const handlePopoverShow = (event: React.MouseEvent<HTMLElement>) => {
    if (!isControlled) setInternalAnchorEl(event.currentTarget);
    onAnchorElChange?.(event.currentTarget);
  };

  const handlePopoverHide = () => {
    if (!isControlled) setInternalAnchorEl(null);
    onAnchorElChange?.(null);
  };

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
              ...getMargin(placement),
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
const getMargin = (placement: PopoverOrigin): React.CSSProperties => {
  if (placement.vertical === 'top') return { marginTop: '-8px' };
  if (placement.vertical === 'bottom') return { marginTop: '8px' };
  return {};
};
