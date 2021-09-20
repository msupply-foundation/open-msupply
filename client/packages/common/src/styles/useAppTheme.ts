import { Direction } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { useState, useEffect } from 'react';
import theme from './theme';
import { useRtl } from '../intl/intlHelpers';

export const useAppTheme = (): Theme => {
  const [currentTheme, setTheme] = useState(theme);
  const isRtl = useRtl();

  const setDirection = (newDirection: Direction) => {
    const newTheme = { ...currentTheme, direction: newDirection };
    setTheme(newTheme);
  };

  useEffect(() => {
    const newDirection = isRtl ? 'rtl' : 'ltr';
    setDirection(newDirection);
  }, [isRtl]);

  return currentTheme;
};
