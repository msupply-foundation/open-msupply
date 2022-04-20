import { FC, PropsWithChildren } from 'react';
import {
  KBarProviderProps,
  KBarPortalProps,
  KBarPositionerProps,
  KBarAnimatorProps,
  KBarSearchProps,
} from 'kbar';
declare module 'kbar' {
  interface RenderParams<T = ActionImpl | string> {
    item: T;
    active: boolean;
  }
  interface KBarResultsProps {
    items: any[];
    onRender: (params: RenderParams) => React.ReactElement;
    maxHeight?: number;
  }

  export const KBarProvider: FC<PropsWithChildren<KBarProviderProps>>;
  export const KBarPortal: FC<PropsWithChildren<KBarPortalProps>>;
  export const KBarPositioner: FC<PropsWithChildren<KBarPositionerProps>>;
  export const KBarAnimator: FC<PropsWithChildren<KBarAnimatorProps>>;
  export const KBarSearch: FC<PropsWithChildren<KBarSearchProps>>;
  export const KBarResults: FC<PropsWithChildren<KBarResultsProps>>;
}
