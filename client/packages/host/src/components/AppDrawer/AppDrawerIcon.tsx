import React from 'react';
import {
  RegexUtils,
  AnimatedMSupplyGuy,
  useDrawer,
  useLocalStorage,
  useTheme,
} from '@openmsupply-client/common';

export const AppDrawerIcon: React.FC = () => {
  const isOpen = useDrawer(s => s.isOpen);
  const theme = useTheme();
  const [customLogo] = useLocalStorage('/theme/logo');

  if (!customLogo)
    return <AnimatedMSupplyGuy size={isOpen ? 'large' : 'medium'} />;

  const style = isOpen
    ? { paddingTop: 20, width: 64, fill: theme.mixins.drawer?.iconColor }
    : { width: 30, fill: theme.mixins.drawer?.iconColor };

  return RegexUtils.extractSvg(customLogo, style);
};
