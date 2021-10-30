import React, { Dispatch, FC, useState, useRef, MutableRefObject } from 'react';
import { BasePopover } from './BasePopover';

type VirtualElement = { getBoundingClientRect: () => DOMRect };

type AnchorElementSetter = React.Dispatch<
  React.SetStateAction<VirtualElement | null>
>;

type AnchorElementSetterRef = MutableRefObject<AnchorElementSetter | null>;
type IsOpenSetterRef = MutableRefObject<Dispatch<
  React.SetStateAction<boolean>
> | null>;

interface UsePopoverControl {
  show: React.MouseEventHandler<HTMLDivElement>;
  hide: () => void;
  Popover: FC;
}

export const usePopover = (): UsePopoverControl => {
  // The Popover component itself carries the state and
  // assigns callbacks to these refs which can control
  // the state. This is done so that we can control the
  // state, but also ensure the Popover component doesn't
  // remount every time the state changes rather than a
  // re-render, as that causes some janky animations when
  // open and moving the mouse.
  const isOpenCallback: IsOpenSetterRef = useRef(null);
  const setAnchorElCallback: AnchorElementSetterRef = useRef(null);

  // TODO: Maybe this should be a generic element. If you come across this and find
  // yourself wanting to have the anchor of a popover be an element other than a div,
  // there was no real reason I made this strictly a div other than that was all I needed
  // at the time.
  const show: React.MouseEventHandler<HTMLDivElement> = e => {
    // TODO: This virtual rect is use to create a virtual element to anchor the popover on. These
    // values make the popover show above the element. If needing a different position, passing
    // a key as a parameter which could change this func and the props to the popover component
    // could be the way to go.

    const getBoundingClientRect = () =>
      ({
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY,
        right: e.clientX,
        width: 0,
        height: 0,
      } as DOMRect);

    isOpenCallback.current?.(true);
    setAnchorElCallback.current?.({ getBoundingClientRect });
  };

  const Popover: FC = React.useCallback(props => {
    const [internalAnchorEl, setInternalAnchorEl] =
      useState<VirtualElement | null>(null);

    const [internalIsOpen, internalSetOpen] = useState(false);

    isOpenCallback.current = internalSetOpen;
    setAnchorElCallback.current = setInternalAnchorEl;

    return (
      <BasePopover
        {...props}
        anchorEl={internalAnchorEl}
        isOpen={internalIsOpen}
      />
    );
  }, []);

  return {
    Popover,
    show,
    hide: () => isOpenCallback.current?.(false),
  };
};
