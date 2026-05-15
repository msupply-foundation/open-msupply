import React from 'react';
import { PluginIcon as DefaultPluginIcon } from '../ui/icons/Plugin';
import { pluginIconRegistry } from '../ui/icons/pluginIconRegistry';
import { PluginIcon } from './types';

/**
 * Render a plugin-supplied icon spec. Resolution priority:
 *   1. React component  - rendered directly
 *   2. String           - looked up in `pluginIconRegistry`
 *   3. Default          - falls back to `PluginIcon`
 */
export const resolvePluginIcon = (icon?: PluginIcon): React.ReactElement => {
  if (typeof icon === 'function') {
    const Icon = icon;
    return <Icon />;
  }
  if (typeof icon === 'string') {
    const Registered = pluginIconRegistry[icon];
    if (Registered) return <Registered />;
    console.warn(
      `Plugin icon name "${icon}" not found in registry; using default.`
    );
  }
  return <DefaultPluginIcon />;
};
