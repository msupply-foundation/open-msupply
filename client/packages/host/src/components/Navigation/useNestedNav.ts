import { useEffect, useState } from 'react';
import { useMatch, useDrawer } from '@openmsupply-client/common';
interface NestedNavState {
  isActive: boolean;
}

const matchPath = (path: string, clicked?: string) =>
  `/${clicked?.replace(/^\//, '')}/`.startsWith(path.replace(/\*$/, ''));

export const useNestedNav = (path: string): NestedNavState => {
  const { clicked, isOpen } = useDrawer();
  const match = useMatch(path);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(!!match);
  }, [match]);

  return { isActive: isOpen && (expanded || matchPath(path, clicked)) };
};
