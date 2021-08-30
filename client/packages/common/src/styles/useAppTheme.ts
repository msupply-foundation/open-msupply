import { Direction } from '@material-ui/core/styles';
import { Theme } from '@material-ui/core';
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
