import { useMatch, useDrawer } from '@openmsupply-client/common';
interface NestedNavState {
  isActive: boolean;
}

const matchPath = (path: string, clickedNavPath?: string) =>
  `/${clickedNavPath?.replace(/^\//, '')}/`.startsWith(path.replace(/\*$/, ''));

export const useNestedNav = (path: string): NestedNavState => {
  const { clickedNavPath, isOpen } = useDrawer();
  const match = useMatch(path);

  const isActive =
    isOpen && (clickedNavPath ? matchPath(path, clickedNavPath) : !!match);

  return { isActive };
};
