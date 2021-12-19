import { useEffect, useState } from 'react';
import { useMatch, useDrawer } from '@openmsupply-client/common';

const matchPath = (key: string, path: string) =>
  `/${key.replace(/^\//, '')}/`.startsWith(path.replace(/\*$/, ''));

interface NestedNavState {
  isActive: boolean;
}

export const useNestedNav = (path: string): NestedNavState => {
  const { hoverActive, isOpen } = useDrawer();
  const match = useMatch(path);
  const [expanded, setExpanded] = useState(false);
  const hovered = Object.keys(hoverActive).some(
    key => matchPath(key, path) && !!hoverActive[key]
  );

  useEffect(() => {
    setExpanded(!!match);
  }, [match]);

  return { isActive: isOpen && (expanded || hovered) };
};
