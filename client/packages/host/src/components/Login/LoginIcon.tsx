import React from 'react';
import {
  MSupplyGuy,
  useLocalStorage,
  useTheme,
  RegexUtils,
} from '@openmsupply-client/common';

export const LoginIcon: React.FC = () => {
  const [customLogo] = useLocalStorage('/theme/logo');
  const logoStyle = { width: 122, height: 180 };
  const theme = useTheme();

  if (!customLogo) return <MSupplyGuy style={logoStyle} />;

  const style = {
    ...logoStyle,
    fill: theme.palette.background.drawer,
  };
  return RegexUtils.extractSvg(customLogo, style);
};
