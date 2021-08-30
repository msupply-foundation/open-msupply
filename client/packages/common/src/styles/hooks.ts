import { Direction } from '@material-ui/core/styles';
import { Theme } from '@material-ui/core';
import { useState, useEffect } from 'react';
import { useHostContext } from '../hooks';
import theme from './theme';

export const useRtl = (): boolean => {
  const { locale } = useHostContext();
  const isRtl = locale !== 'en';
  return isRtl;
};

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
