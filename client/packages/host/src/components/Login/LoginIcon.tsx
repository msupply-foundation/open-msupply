import React from 'react';
import {
  MSupplyGuy,
  useLocalStorage,
  useAppTheme,
  RegexUtils,
  useMediaQuery,
  Breakpoints,
} from '@openmsupply-client/common';

export const LoginIcon = ({ small = false }: { small?: boolean }) => {
  const theme = useAppTheme();
  const [customLogo] = useLocalStorage('/theme/logo');
  const isSmallScreen =
    useMediaQuery(theme.breakpoints.down(Breakpoints.md)) || small;
  const logoStyle = isSmallScreen
    ? { width: 155, height: 90 }
    : { width: 285, height: 180 };

  if (!customLogo) return <MSupplyGuy style={logoStyle} />;

  const style = {
    ...logoStyle,
    fill: theme.palette.background.drawer,
  };
  return RegexUtils.extractSvg(customLogo, style);
};
