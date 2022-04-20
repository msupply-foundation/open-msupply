import React, {
  Dispatch,
  FC,
  useState,
  useRef,
  MutableRefObject,
  PropsWithChildren,
} from 'react';
import { BasePopoverProps } from '.';
import { useDebounceCallback } from '@common/hooks';
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
  show: React.MouseEventHandler<HTMLDivElement | HTMLButtonElement>;
  hide: () => void;
  Popover: FC<Partial<PropsWithChildren<BasePopoverProps>>>;
}

interface UsePopoverOptions {
  showDebounceDelay?: number;
  hideDebounceDelay?: number;
}

export const usePopover = ({
  showDebounceDelay = 250,
  hideDebounceDelay = 500,
}: UsePopoverOptions = {}): UsePopoverControl => {
  // The Popover component itself carries the state and
  // assigns callbacks to these refs which can control
  // the state. This is done so that we can control the
  // state, but also ensures the Popover component doesn't
  // remount every time the state changes rather than a
  // re-render, as that causes some janky animations when
  // open and moving the mouse.
  const isOpenCallback: IsOpenSetterRef = useRef(null);
  const setAnchorElCallback: AnchorElementSetterRef = useRef(null);

  // TODO: Maybe this should be a generic element. If you come across this and find
  // yourself wanting to have the anchor of a popover be some other element,
  // there was no real reason I made this not generic other than that was all I needed
  // at the time.

  const showCallback: React.MouseEventHandler<
    HTMLDivElement | HTMLButtonElement
  > = e => {
    // TODO: This virtual rect is used to create a virtual element to anchor the popover on. These
    // values make the popover show above the element. If needing a different position, passing
    // a key as a parameter which could change this func and the props to the popover component
    // could be the way to go.

    const getBoundingClientRect = () =>
      ({
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY,
        right: e.clientX,
        width: 25,
        height: 25,
      } as DOMRect);

    setAnchorElCallback.current?.({ getBoundingClientRect });
    isOpenCallback.current?.(true);
  };

  const hideCallback = () => {
    isOpenCallback.current?.(false);
  };

  const show = useDebounceCallback(showCallback, [], showDebounceDelay);
  const hide = useDebounceCallback(hideCallback, [], hideDebounceDelay);

  const Popover: FC<Partial<PropsWithChildren<BasePopoverProps>>> =
    React.useCallback(props => {
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
    hide,
  };
};
