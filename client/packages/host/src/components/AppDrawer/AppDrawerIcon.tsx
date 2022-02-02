import React from 'react';
import {
  extractSvg,
  MSupplyGuy,
  useDrawer,
  useLocalStorage,
  useTheme,
} from '@openmsupply-client/common';

export const AppDrawerIcon: React.FC = () => {
  const drawer = useDrawer();
  const theme = useTheme();
  const [customLogo] = useLocalStorage('/theme/logo');

  if (!customLogo)
    return <MSupplyGuy size={drawer.isOpen ? 'large' : 'medium'} />;

  const style = drawer.isOpen
    ? { paddingTop: 20, width: 64 }
    : { width: 30, fill: theme.mixins.drawer?.iconColor };

  return extractSvg(customLogo, style);
};
