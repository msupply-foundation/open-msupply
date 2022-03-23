import React from 'react';
import {
  RegexUtils,
  MSupplyGuyGradient,
  useDrawer,
  useLocalStorage,
  useTheme,
} from '@openmsupply-client/common';

export const AppDrawerIcon: React.FC = () => {
  const drawer = useDrawer();
  const theme = useTheme();
  const [customLogo] = useLocalStorage('/theme/logo');

  if (!customLogo)
    return <MSupplyGuyGradient size={drawer.isOpen ? 'large' : 'medium'} />;

  const style = drawer.isOpen
    ? { paddingTop: 20, width: 64, fill: theme.mixins.drawer?.iconColor }
    : { width: 30, fill: theme.mixins.drawer?.iconColor };

  return RegexUtils.extractSvg(customLogo, style);
};
