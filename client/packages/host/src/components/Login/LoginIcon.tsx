import React from 'react';
import {
  MSupplyGuy,
  useLocalStorage,
  useTheme,
  RegexUtils,
  useIsSmallScreen,
} from '@openmsupply-client/common';

export const LoginIcon = ({ small = false }: { small?: boolean }) => {
  const [customLogo] = useLocalStorage('/theme/logo');
  const isSmallScreen = useIsSmallScreen() || small;
  const logoStyle = isSmallScreen
    ? { width: 155, height: 90 }
    : { width: 285, height: 180 };
  const theme = useTheme();

  if (!customLogo) return <MSupplyGuy style={logoStyle} />;

  const style = {
    ...logoStyle,
    fill: theme.palette.background.drawer,
  };
  return RegexUtils.extractSvg(customLogo, style);
};
