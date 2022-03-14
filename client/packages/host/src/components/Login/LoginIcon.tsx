import React from 'react';
import {
  MSupplyGuyGradient,
  useLocalStorage,
  useTheme,
  RegexUtils,
} from '@openmsupply-client/common';

export const LoginIcon: React.FC = () => {
  const [customLogo] = useLocalStorage('/theme/logo');
  const logoStyle = { width: 122, height: 180 };
  const theme = useTheme();

  if (!customLogo) return <MSupplyGuyGradient style={logoStyle} />;

  const style = {
    ...logoStyle,
    fill: theme.palette.background.drawer,
  };
  return RegexUtils.extractSvg(customLogo, style);
};
