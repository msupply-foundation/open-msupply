import { RefObject } from 'react';
import create from 'zustand';
import { useBoundingClientRectRef } from './../useBoundingClientRect';

interface AppBarRect {
  setAppBarRect: (rect: DOMRect) => void;
  height: number | null;
  width: number | null;
  bottom: number | null;
  left: number | null;
  right: number | null;
  top: number | null;
  x: number | null;
  y: number | null;
}

export const useAppBarRectStore = create<AppBarRect>(set => ({
  setAppBarRect: ({ height, width, bottom, left, right, top, x, y }: DOMRect) =>
    set(state => ({ ...state, height, width, bottom, left, right, top, x, y })),
  height: null,
  width: null,
  bottom: null,
  left: null,
  right: null,
  top: null,
  x: null,
  y: null,
}));

export const useAppBarRect = <T extends HTMLElement>(): AppBarRect & {
  ref: RefObject<T>;
} => {
  const { setAppBarRect, ...rest } = useAppBarRectStore();
  const { ref } = useBoundingClientRectRef<T>(setAppBarRect);

  return { ref, setAppBarRect, ...rest };
};
