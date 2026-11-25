// KB-X5's fallback when the breadcrumb names no parent: the nearest ancestor
// that is a screen, else Home. Not "drop one segment" — a section prefix
// (`inventory`) is no screen (issue #288).

import { activePages } from '../plugins/pluginPages';
import { navDestinations } from './navConfig';

/** The nearest proper ancestor `isPlace` accepts, or '' (the store root). */
export const placeAbove = (
  relativePath: string,
  isPlace: (path: string) => boolean
): string => {
  const segments = relativePath.split('/').filter(Boolean);
  for (let depth = segments.length - 1; depth > 0; depth--) {
    const candidate = segments.slice(0, depth).join('/');
    if (isPlace(candidate)) return candidate;
  }
  return '';
};

const destinationPaths = new Set(
  navDestinations.map(dest => dest.path).filter(path => path !== '')
);

/** A registry destination or plugin page. */
export const isRegistryPlace = (path: string): boolean =>
  destinationPaths.has(path) ||
  activePages().some(registered => registered.page.path === path);
