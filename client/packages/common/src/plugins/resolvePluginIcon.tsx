import React from 'react';
import { PluginIcon as DefaultPluginIcon } from '../ui/icons/Plugin';
import { PluginIcon } from './types';

/**
 * Render a plugin-supplied icon, themed to match built-in nav icons.
 * Falls back to a default plug icon when no component is provided.
 */
export const resolvePluginIcon = (Icon?: PluginIcon): React.ReactElement => {
  const Component = Icon ?? DefaultPluginIcon;
  return <Component color="primary" fontSize="small" />;
};
